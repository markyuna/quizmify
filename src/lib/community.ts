import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";
import { getAcceptedFriendIds } from "@/lib/friends";
import { PRESENCE_ONLINE_WINDOW_MS } from "@/lib/presence";
import { getTodayDateKey } from "@/lib/dailyChallenge";

/**
 * Aggregate figures below this are hidden from the homepage community band
 * rather than shown as-is: "1 player today" reads as an empty room, not a
 * live community, and a tiny count next to the friends-online block can let
 * a signed-in viewer infer exactly who else is playing.
 */
export const COMMUNITY_MIN_DISPLAY_COUNT = 5;

/**
 * How long the anonymous aggregates are cached for (shared across every
 * visitor and instance via Next's data cache), so the homepage costs at most
 * one stats query per window regardless of traffic.
 */
export const COMMUNITY_STATS_REVALIDATE_SECONDS = 60;

/** Avatars rendered in the friends-online row; the rest collapse into "+N". */
export const COMMUNITY_MAX_ONLINE_FRIEND_AVATARS = 5;

export type CommunityStats = {
  playersToday: number;
  gamesToday: number;
  gamesLastHour: number;
};

/**
 * Anonymous, aggregate-only activity for the current UTC day -- never any
 * identity. Deliberately limited to sources that are cheap to count by time
 * window with the indexes that already exist:
 *
 * - Attempt (completed quizzes, signed-in users): @@index([createdAt]).
 * - DailyChallengeAttempt: scoped to today's DailyChallenge rows through
 *   @@index([dailyChallengeId]) (DailyChallenge is unique on [date, ...]).
 * - GuestAttempt (the 3 daily guest games, guests included): scoped to
 *   today's DailyGameChallenge rows through @@unique([challengeId, guestId]).
 *   DailyGameChallenge holds a handful of rows per day, so filtering it on
 *   `date` alone is a trivially small scan.
 *
 * Not counted, on purpose: User.lastSeenAt and Game.timeStarted (no index a
 * global time window can use -- counting them would scan the table) and the
 * Pro games (Morpion, Akinator, Crucigrama, Peintre, Puzzle du Jour), whose
 * only date indexes lead with userId. Figures are therefore a floor, not an
 * exact total.
 *
 * A player is deduped across sources: a signed-in user's daily guest game is
 * attributed to their account via UserDailyAttempt (or claimedByUserId), and
 * guests are keyed by their opaque guestId cookie, prefixed so it can never
 * collide with a User id.
 */
async function computeCommunityStats(): Promise<CommunityStats> {
  const now = new Date();
  const dateKey = getTodayDateKey(now);
  // Passed as UTC ISO strings and cast in SQL rather than as Date params:
  // Prisma stores DateTime as UTC in `timestamp without time zone`, and
  // casting an ISO string to `timestamp` keeps its UTC wall-clock time
  // regardless of how the pg driver would serialize a JS Date.
  const dayStart = `${dateKey}T00:00:00.000Z`;
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const rows = await prisma.$queryRaw<
    Array<{ playersToday: number; gamesToday: number; gamesLastHour: number }>
  >`
    WITH activity AS (
      SELECT a."userId" AS player, a."createdAt" AS "createdAt"
      FROM "Attempt" a
      WHERE a."createdAt" >= ${dayStart}::timestamp
      UNION ALL
      SELECT dca."userId", dca."createdAt"
      FROM "DailyChallengeAttempt" dca
      WHERE dca."dailyChallengeId" IN (SELECT id FROM "DailyChallenge" WHERE "date" = ${dateKey})
      UNION ALL
      SELECT COALESCE(uda."userId", ga."claimedByUserId", 'guest:' || ga."guestId"), ga."createdAt"
      FROM "GuestAttempt" ga
      LEFT JOIN "UserDailyAttempt" uda ON uda."guestAttemptId" = ga.id
      WHERE ga."challengeId" IN (SELECT id FROM "DailyGameChallenge" WHERE "date" = ${dateKey})
    )
    SELECT COUNT(DISTINCT player)::int AS "playersToday",
           COUNT(*)::int AS "gamesToday",
           COUNT(*) FILTER (WHERE "createdAt" >= ${hourAgo}::timestamp)::int AS "gamesLastHour"
    FROM activity
  `;

  const row = rows[0];
  return {
    playersToday: Number(row?.playersToday ?? 0),
    gamesToday: Number(row?.gamesToday ?? 0),
    gamesLastHour: Number(row?.gamesLastHour ?? 0),
  };
}

/**
 * Cached wrapper around computeCommunityStats(). Takes no arguments and
 * reads no cookies/headers, so the single cache entry is shared by every
 * visitor -- signed in or not, any locale.
 */
export const getCommunityStats = unstable_cache(computeCommunityStats, ["community-stats"], {
  revalidate: COMMUNITY_STATS_REVALIDATE_SECONDS,
});

export type OnlineFriend = {
  userId: string;
  name: string;
  image: string | null;
};

export type OnlineFriendsSummary = {
  friendCount: number;
  onlineCount: number;
  // At most COMMUNITY_MAX_ONLINE_FRIEND_AVATARS, most recently seen first.
  online: OnlineFriend[];
};

/**
 * Lightweight alternative to getFriendsOverview() for the homepage: only
 * accepted friends, only those currently online (same window as isOnline()
 * in presence.ts), only the fields an avatar row needs. Two queries -- the
 * second is a primary-key lookup, so it needs no index on lastSeenAt.
 * Per-user, so never cached globally.
 */
export async function getOnlineFriendsSummary(userId: string): Promise<OnlineFriendsSummary> {
  const friendIds = await getAcceptedFriendIds(userId);
  if (friendIds.length === 0) {
    return { friendCount: 0, onlineCount: 0, online: [] };
  }

  const cutoff = new Date(Date.now() - PRESENCE_ONLINE_WINDOW_MS);
  const onlineUsers = await prisma.user.findMany({
    where: { id: { in: friendIds }, lastSeenAt: { gte: cutoff } },
    select: { id: true, name: true, image: true },
    orderBy: { lastSeenAt: "desc" },
  });

  return {
    friendCount: friendIds.length,
    onlineCount: onlineUsers.length,
    online: onlineUsers.slice(0, COMMUNITY_MAX_ONLINE_FRIEND_AVATARS).map((user) => ({
      userId: user.id,
      name: user.name ?? "Anonymous",
      image: user.image,
    })),
  };
}
