import type { Prisma } from "@/generated/prisma/client";
import { PersonalityTestKey } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";
import { withPersonalityBonus } from "@/lib/neurons";
import { computeResult, type PersonalityTestAnswer } from "./scoring";

export { PersonalityTestKey };

export const PERSONALITY_TEST_KEYS = Object.values(PersonalityTestKey);

export function isPersonalityTestKey(value: string): value is PersonalityTestKey {
  return (PERSONALITY_TEST_KEYS as readonly string[]).includes(value);
}

export class PersonalityAnimalAlreadyAssignedError extends Error {}
export class PersonalityTestAttemptNotFoundError extends Error {}
export class PersonalityTestAttemptNotDeletableError extends Error {}

export type CreateAttemptParams = {
  testKey: PersonalityTestKey;
  guestId: string;
  answers: PersonalityTestAnswer[];
  // Present when the browser is already authenticated at submit time. The
  // attempt is stamped claimed right away (claimedByUserId/claimedAt) so it
  // never needs the guest -> account claim mechanism below, but isOfficial
  // stays false -- confirmPersonalityTestAttempt() is what fixes the animal,
  // not submit. Throws PersonalityAnimalAlreadyAssignedError up front (no
  // row written) if this user already has a permanent result.
  userId?: string;
};

/**
 * Scores an answer set server-side and persists the attempt -- no
 * one-attempt guard here (unlike GuestAttempt), retaking an evergreen
 * personality test is expected, so every submit creates a new row. The
 * animal itself is never written to User here for either guest or logged-in
 * callers: that only happens at explicit confirmation (see
 * confirmPersonalityTestAttempt for a logged-in user's own attempt, or
 * claimPersonalityTestAttempts for a guest attempt claimed at account
 * signup).
 */
export async function createPersonalityTestAttempt({ testKey, guestId, answers, userId }: CreateAttemptParams) {
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { personalityAnimal: true } });
    if (user?.personalityAnimal) {
      throw new PersonalityAnimalAlreadyAssignedError(`User ${userId} already has a personality animal assigned`);
    }
  }

  const { scores, resultKey, categoryScores } = computeResult(answers);
  const now = new Date();

  return prisma.personalityTestAttempt.create({
    data: {
      testKey,
      guestId,
      answers: answers as unknown as Prisma.InputJsonValue,
      scores: scores as unknown as Prisma.InputJsonValue,
      resultKey,
      categoryScores: categoryScores as unknown as Prisma.InputJsonValue,
      ...(userId ? { claimedByUserId: userId, claimedAt: now } : {}),
    },
  });
}

/**
 * Fixes a logged-in user's own attempt as their permanent result -- the
 * "Confirmar" button in the result modal. Requires the attempt to already
 * be claimed by this exact userId (set at submit time, see
 * createPersonalityTestAttempt) and rejects anything else as not-found
 * rather than leaking whether some other attemptId exists. Idempotent:
 * confirming an already-official attempt again (double-click) is a no-op
 * success, not an error. Throws PersonalityAnimalAlreadyAssignedError if the
 * user picked up a permanent animal some other way (e.g. a claim from a
 * different guest session) between opening the result modal and clicking
 * confirm.
 */
export async function confirmPersonalityTestAttempt(userId: string, attemptId: string) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.personalityTestAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.claimedByUserId !== userId) {
      throw new PersonalityTestAttemptNotFoundError(`Attempt ${attemptId} not found for user ${userId}`);
    }

    if (attempt.isOfficial) {
      return attempt;
    }

    const user = await tx.user.findUnique({ where: { id: userId }, select: { personalityAnimal: true } });
    if (user?.personalityAnimal) {
      throw new PersonalityAnimalAlreadyAssignedError(`User ${userId} already has a personality animal assigned`);
    }

    const now = new Date();

    const confirmed = await tx.personalityTestAttempt.update({
      where: { id: attemptId },
      data: { isOfficial: true },
    });

    await tx.user.update({
      where: { id: userId },
      data: withPersonalityBonus({ personalityAnimal: attempt.resultKey, personalityAnimalSetAt: now }),
    });

    return confirmed;
  });
}

export type DeletePersonalityTestAttemptParams = {
  attemptId: string;
  // Exactly one of these is set, mirroring the session-vs-guest branch
  // every other route in this file takes.
  userId?: string;
  guestId?: string;
};

/**
 * Deletes exactly one attempt -- the "Reintentar" button in the result
 * modal, discarding a result the user actively rejected rather than keeping
 * it as unclaimed history. `id: attemptId` is always part of the where
 * clause, so this can never widen into a deleteMany scoped only by
 * userId/guestId. Only deletes a row that's still eligible to be discarded:
 * not already official, and for a guest, not already claimed onto some
 * account. Throws (and deletes nothing) if those conditions aren't met --
 * e.g. the row is already the confirmed official result, or belongs to
 * someone else.
 */
export async function deletePersonalityTestAttempt({ attemptId, userId, guestId }: DeletePersonalityTestAttemptParams) {
  const result = await prisma.personalityTestAttempt.deleteMany({
    where: userId
      ? { id: attemptId, claimedByUserId: userId, isOfficial: false }
      : { id: attemptId, guestId: guestId ?? "", claimedByUserId: null, isOfficial: false },
  });
  if (result.count === 0) {
    throw new PersonalityTestAttemptNotDeletableError(`Attempt ${attemptId} is not deletable for this requester`);
  }
}

export type ClaimPersonalityTestAttemptsResult = {
  claimedCount: number;
  latestAttemptId: string | null;
};

/**
 * Migrates every not-yet-claimed personality-test attempt for guestId onto
 * userId. Mirrors claimGuestAttempts in guestPlay.ts, minus the XP/streak
 * side effects (a personality test isn't part of the XP loop).
 *
 * Among the claimed rows, the most recently created one is the candidate
 * "official" result (guest -> account: most recent attempt before signup
 * wins). It's only actually promoted -- isOfficial flipped, resultKey
 * written to User.personalityAnimal -- if the user doesn't already have a
 * permanent animal (same "set once, never overwritten" rule
 * confirmPersonalityTestAttempt enforces, for a user who already has one and
 * then plays again as a guest before logging back in). Every candidate row
 * still gets claimedByUserId/claimedAt stamped regardless, so history is
 * never lost even when it doesn't become official.
 *
 * Returns the most recently created claimed attempt so the caller can
 * route straight to its result page.
 */
export async function claimPersonalityTestAttempts(
  userId: string,
  guestId: string,
  now: Date = new Date()
): Promise<ClaimPersonalityTestAttemptsResult> {
  return prisma.$transaction(async (tx) => {
    const candidates = await tx.personalityTestAttempt.findMany({
      where: { guestId, claimedByUserId: null },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (candidates.length === 0) {
      return { claimedCount: 0, latestAttemptId: null };
    }

    const ids = candidates.map((row) => row.id);
    const winnerId = ids[0];

    const user = await tx.user.findUnique({ where: { id: userId }, select: { personalityAnimal: true } });
    const shouldPromoteWinner = !user?.personalityAnimal;

    const claimResult = await tx.personalityTestAttempt.updateMany({
      where: { id: { in: ids }, claimedByUserId: null },
      data: { claimedByUserId: userId, claimedAt: now },
    });

    if (claimResult.count === 0) {
      return { claimedCount: 0, latestAttemptId: null };
    }

    if (shouldPromoteWinner) {
      const winner = await tx.personalityTestAttempt.update({
        where: { id: winnerId },
        data: { isOfficial: true },
        select: { resultKey: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: withPersonalityBonus({ personalityAnimal: winner.resultKey, personalityAnimalSetAt: now }),
      });
    }

    return { claimedCount: claimResult.count, latestAttemptId: winnerId };
  });
}

/** Only returns a claimed attempt -- an unclaimed one's result stays hidden until registration. */
export async function getClaimedPersonalityTestAttempt(id: string) {
  const attempt = await prisma.personalityTestAttempt.findUnique({ where: { id } });
  if (!attempt || !attempt.claimedByUserId) return null;
  return attempt;
}
