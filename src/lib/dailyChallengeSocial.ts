import { prisma } from "@/lib/db";
import { COMMUNITY_MIN_DISPLAY_COUNT, formatPublicPlayerName } from "@/lib/community";

/**
 * "Who already played today's Daily Challenge" context for the reminder
 * email, loaded in bulk once per cron run (2 queries total) instead of per
 * recipient.
 *
 * Privacy: a recipient only ever sees their own *accepted friends*, and
 * friends who turned off User.showInCommunityFeed are left out entirely --
 * the same opt-out the homepage ticker honours. Non-friends only show up as
 * an anonymous count, behind the same small-number guard as the homepage.
 */

export type DailyChallengeSocialProof =
  | {
      kind: "friends";
      /** Best-scoring friend's public name ("Marcos S."), or null if none has a usable name. */
      topFriendName: string | null;
      topFriendCorrect: number;
      topFriendTotal: number;
      /** Friends who played besides the named one (or all of them when topFriendName is null). */
      otherFriendsCount: number;
    }
  | { kind: "players"; count: number };

type ChallengeAttempt = {
  userId: string;
  correctAnswers: number;
  totalQuestions: number;
  createdAt: Date;
  name: string | null;
  showInCommunityFeed: boolean;
};

export type DailyChallengeSocialContext = {
  hasPlayed: (challengeId: string, userId: string) => boolean;
  getSocialProof: (challengeId: string, userId: string) => DailyChallengeSocialProof | null;
};

export async function loadDailyChallengeSocialContext(
  challengeIds: string[]
): Promise<DailyChallengeSocialContext> {
  const attempts = await prisma.dailyChallengeAttempt.findMany({
    where: { dailyChallengeId: { in: challengeIds } },
    select: {
      dailyChallengeId: true,
      userId: true,
      correctAnswers: true,
      totalQuestions: true,
      createdAt: true,
      user: { select: { name: true, showInCommunityFeed: true } },
    },
  });

  const attemptsByChallenge = new Map<string, Map<string, ChallengeAttempt>>();
  for (const attempt of attempts) {
    let byUser = attemptsByChallenge.get(attempt.dailyChallengeId);
    if (!byUser) {
      byUser = new Map();
      attemptsByChallenge.set(attempt.dailyChallengeId, byUser);
    }
    byUser.set(attempt.userId, {
      userId: attempt.userId,
      correctAnswers: attempt.correctAnswers,
      totalQuestions: attempt.totalQuestions,
      createdAt: attempt.createdAt,
      name: attempt.user.name,
      showInCommunityFeed: attempt.user.showInCommunityFeed,
    });
  }

  // Every accepted friendship touching someone who played: that's enough to
  // answer "which of my friends played" for any recipient, since the edge
  // (recipient, player) is always in this set.
  const playerIds = [...new Set(attempts.map((a) => a.userId))];
  const friendsOf = new Map<string, Set<string>>();
  if (playerIds.length > 0) {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "accepted",
        OR: [{ requesterId: { in: playerIds } }, { addresseeId: { in: playerIds } }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    const link = (a: string, b: string) => {
      let set = friendsOf.get(a);
      if (!set) {
        set = new Set();
        friendsOf.set(a, set);
      }
      set.add(b);
    };
    for (const { requesterId, addresseeId } of friendships) {
      link(requesterId, addresseeId);
      link(addresseeId, requesterId);
    }
  }

  return {
    hasPlayed: (challengeId, userId) => attemptsByChallenge.get(challengeId)?.has(userId) ?? false,

    getSocialProof: (challengeId, userId) => {
      const byUser = attemptsByChallenge.get(challengeId);
      if (!byUser) return null;

      const friendIds = friendsOf.get(userId);
      const friendAttempts = friendIds
        ? [...friendIds]
            .map((id) => byUser.get(id))
            .filter((a): a is ChallengeAttempt => a !== undefined && a.showInCommunityFeed)
        : [];

      if (friendAttempts.length > 0) {
        friendAttempts.sort(
          (a, b) => b.correctAnswers - a.correctAnswers || a.createdAt.getTime() - b.createdAt.getTime()
        );
        const named = friendAttempts
          .map((a) => ({ attempt: a, name: formatPublicPlayerName(a.name) }))
          .find((entry) => entry.name !== null);

        return named
          ? {
              kind: "friends",
              topFriendName: named.name,
              topFriendCorrect: named.attempt.correctAnswers,
              topFriendTotal: named.attempt.totalQuestions,
              otherFriendsCount: friendAttempts.length - 1,
            }
          : {
              kind: "friends",
              topFriendName: null,
              topFriendCorrect: 0,
              topFriendTotal: 0,
              otherFriendsCount: friendAttempts.length,
            };
      }

      const count = byUser.size;
      return count >= COMMUNITY_MIN_DISPLAY_COUNT ? { kind: "players", count } : null;
    },
  };
}
