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

/** How far back the activity ticker looks. */
export const COMMUNITY_ACTIVITY_WINDOW_DAYS = 3;

/** Most recent games shown in the activity ticker. */
export const COMMUNITY_ACTIVITY_LIMIT = 20;

/**
 * What a ticker item was: a quiz or the daily challenge (both shown with
 * their topic), or the key of a game in ALL_GAMES (shown with that game's
 * title).
 */
export type CommunityActivityKind =
  | "quiz"
  | "daily-challenge"
  | "word-of-day"
  | "photo-of-day"
  | "math-target"
  | "morpion"
  | "akinator"
  | "qui-est-le-peintre"
  | "crucigrama"
  | "puzzle-du-jour";

export type CommunityActivityItem = {
  id: string;
  kind: CommunityActivityKind;
  // Quiz / daily challenge topic, null for the other games.
  topic: string | null;
  // The quiz's category, so the ticker can link to a replay of it in the
  // same scope. Null for everything but quizzes.
  categorySlug: string | null;
  // "First L.", or null for a guest or an account without a usable name --
  // the UI renders a generic "a player" label instead.
  playerName: string | null;
  // ISO string rather than Date: unstable_cache round-trips through JSON.
  playedAt: string;
};

/**
 * Shortens an account name for public display: first word plus the
 * initial of the second ("Marcos Suárez Ruiz" -> "Marcos S.", the first
 * surname in Spanish naming), never a full surname. Names that look like an email address (some credentials
 * sign-ups) are treated as unusable rather than leaking it.
 */
export function formatPublicPlayerName(name: string | null): string | null {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0 || words.some((word) => word.includes("@"))) return null;

  const first = words[0];
  if (words.length === 1) return first;
  return `${first} ${words[1].charAt(0).toUpperCase()}.`;
}

/**
 * The most recent finished games across every game type for the homepage
 * activity ticker -- the one place the community band shows identities to
 * anonymous visitors, so only as formatPublicPlayerName() and only for
 * users with showInCommunityFeed on (an opted-out user's games are dropped,
 * not anonymized). Unclaimed guest games are kept with no name.
 *
 * Unlike computeCommunityStats, the Pro game tables are included here (the
 * ticker should name the game that was played): their only date indexes
 * lead with userId, so these branches scan the tables -- acceptable while
 * they're small, and bounded to one query per cache window for the whole
 * site.
 */
async function computeRecentCommunityActivity(): Promise<CommunityActivityItem[]> {
  const now = new Date();
  const since = new Date(now.getTime() - COMMUNITY_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();
  // Daily challenge / guest game rows are keyed by UTC date string; the
  // timestamp filter below still applies, this just lets the date indexes
  // narrow the scan first.
  const sinceDateKey = getTodayDateKey(since);

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      kind: string;
      topic: string | null;
      categorySlug: string | null;
      name: string | null;
      playedAt: Date;
    }>
  >`
    WITH activity AS (
      SELECT a.id, 'quiz' AS kind, a."userId" AS "userId", g.topic AS topic, g."categorySlug" AS "categorySlug", a."createdAt" AS "playedAt"
      FROM "Attempt" a
      JOIN "Game" g ON g.id = a."gameId"
      -- Same exclusions as the leaderboard: "Practice Mistakes" is the
      -- internal topic of the /quiz/mistakes review mode, not a real quiz.
      WHERE a."createdAt" >= ${sinceIso}::timestamp AND g.topic NOT IN ('', 'Practice Mistakes')
      UNION ALL
      SELECT dca.id, 'daily-challenge', dca."userId", dc.topic, NULL, dca."createdAt"
      FROM "DailyChallengeAttempt" dca
      JOIN "DailyChallenge" dc ON dc.id = dca."dailyChallengeId"
      WHERE dc."date" >= ${sinceDateKey} AND dca."createdAt" >= ${sinceIso}::timestamp
      UNION ALL
      SELECT ga.id, replace(ga."gameKey"::text, '_', '-'), COALESCE(uda."userId", ga."claimedByUserId"), NULL, NULL, ga."createdAt"
      FROM "GuestAttempt" ga
      JOIN "DailyGameChallenge" dgc ON dgc.id = ga."challengeId"
      LEFT JOIN "UserDailyAttempt" uda ON uda."guestAttemptId" = ga.id
      WHERE dgc."date" >= ${sinceDateKey} AND ga."createdAt" >= ${sinceIso}::timestamp
      UNION ALL
      SELECT m.id, 'morpion', m."userId", NULL, NULL, m."completedAt"
      FROM "MorpionGame" m
      WHERE m.status <> 'in_progress' AND m."completedAt" >= ${sinceIso}::timestamp
      UNION ALL
      SELECT ak.id, 'akinator', ak."userId", NULL, NULL, ak."completedAt"
      FROM "AkinatorGame" ak
      WHERE ak.status <> 'in_progress' AND ak."completedAt" >= ${sinceIso}::timestamp
      UNION ALL
      SELECT p.id, 'qui-est-le-peintre', p."userId", NULL, NULL, p."completedAt"
      FROM "PeintreGame" p
      WHERE p.status = 'completed' AND p."completedAt" >= ${sinceIso}::timestamp
      UNION ALL
      SELECT c.id, 'crucigrama', c."userId", NULL, NULL, c."completedAt"
      FROM "CrucigramaGame" c
      WHERE c.status = 'completed' AND c."completedAt" >= ${sinceIso}::timestamp
      UNION ALL
      SELECT pz.id, 'puzzle-du-jour', pz."userId", NULL, NULL, pz."completedAt"
      FROM "PuzzleDuJourGame" pz
      WHERE pz.status = 'completed' AND pz."completedAt" >= ${sinceIso}::timestamp
    )
    SELECT id, kind, topic, "categorySlug", name, "playedAt"
    FROM (
      SELECT act.id, act.kind, act.topic, act."categorySlug", u.name, act."playedAt",
             -- A player replaying the same quiz/game back to back would
             -- otherwise fill the ticker with one line: keep only their
             -- latest play of each.
             ROW_NUMBER() OVER (
               PARTITION BY act."userId", act.kind, act.topic
               ORDER BY act."playedAt" DESC
             ) AS rn
      FROM activity act
      LEFT JOIN "User" u ON u.id = act."userId"
      WHERE act."userId" IS NULL OR u."showInCommunityFeed"
    ) latest
    WHERE rn = 1
    ORDER BY "playedAt" DESC
    LIMIT ${COMMUNITY_ACTIVITY_LIMIT}
  `;

  return rows.map((row) => ({
    id: `${row.kind}:${row.id}`,
    kind: row.kind as CommunityActivityKind,
    topic: row.topic,
    categorySlug: row.categorySlug,
    playerName: formatPublicPlayerName(row.name),
    playedAt: new Date(row.playedAt).toISOString(),
  }));
}

/** Same global, cookie-free cache as getCommunityStats. */
export const getRecentCommunityActivity = unstable_cache(
  computeRecentCommunityActivity,
  ["community-activity"],
  { revalidate: COMMUNITY_STATS_REVALIDATE_SECONDS }
);

/**
 * Today's daily challenge for one language, as the homepage band shows it:
 * the topic plus the most recent finished attempt. Strictly read-only --
 * unlike getOrCreateTodaysChallenge() it never generates the challenge, so a
 * homepage visit can't trigger an OpenAI call; before anyone has opened
 * today's challenge in this language it returns null and the band shows its
 * call to action without a topic or a score.
 */
export type DailyChallengeSpotlight = {
  topic: string;
  lastPlayer: {
    // "First L.", or null when the account has no usable name.
    name: string | null;
    // Percentage, as stored on DailyChallengeAttempt.
    score: number;
    // ISO string rather than Date: unstable_cache round-trips through JSON.
    playedAt: string;
  } | null;
};

async function computeDailyChallengeSpotlight(language: string): Promise<DailyChallengeSpotlight | null> {
  const challenge = await prisma.dailyChallenge.findUnique({
    where: { date_language: { date: getTodayDateKey(), language } },
    select: { id: true, topic: true },
  });
  if (!challenge) return null;

  // Same opt-out rule as the activity ticker: a user with showInCommunityFeed
  // off is skipped entirely (not shown as "a player"). One day's attempts for
  // one language is a small set, scoped by @@index([dailyChallengeId]).
  const last = await prisma.dailyChallengeAttempt.findFirst({
    where: { dailyChallengeId: challenge.id, user: { showInCommunityFeed: true } },
    orderBy: { createdAt: "desc" },
    select: { score: true, createdAt: true, user: { select: { name: true } } },
  });

  return {
    topic: challenge.topic,
    lastPlayer: last
      ? {
          name: formatPublicPlayerName(last.user.name),
          score: last.score,
          playedAt: last.createdAt.toISOString(),
        }
      : null,
  };
}

/**
 * Same global, cookie-free cache as getCommunityStats. The language is an
 * argument, and unstable_cache folds arguments into the key, so each
 * language gets its own entry.
 */
export const getDailyChallengeSpotlight = unstable_cache(
  computeDailyChallengeSpotlight,
  ["daily-challenge-spotlight"],
  { revalidate: COMMUNITY_STATS_REVALIDATE_SECONDS }
);

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
