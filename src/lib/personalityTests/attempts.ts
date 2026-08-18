import type { Prisma } from "@/generated/prisma/client";
import { PersonalityTestKey } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";
import { computeResult, type PersonalityTestAnswer } from "./scoring";

export { PersonalityTestKey };

export const PERSONALITY_TEST_KEYS = Object.values(PersonalityTestKey);

export function isPersonalityTestKey(value: string): value is PersonalityTestKey {
  return (PERSONALITY_TEST_KEYS as readonly string[]).includes(value);
}

export class PersonalityAnimalAlreadyAssignedError extends Error {}

export type CreateAttemptParams = {
  testKey: PersonalityTestKey;
  guestId: string;
  answers: PersonalityTestAnswer[];
};

/**
 * Scores a guest's answers server-side and persists the attempt -- no
 * one-attempt guard here (unlike GuestAttempt), retaking an evergreen
 * personality test is expected, so every submit creates a new row. Left
 * unclaimed (claimedByUserId null, isOfficial false) until
 * claimPersonalityTestAttempts() picks a winner at account-claim time.
 */
export async function createPersonalityTestAttempt({ testKey, guestId, answers }: CreateAttemptParams) {
  const { scores, resultKey, categoryScores } = computeResult(answers);

  return prisma.personalityTestAttempt.create({
    data: {
      testKey,
      guestId,
      answers: answers as unknown as Prisma.InputJsonValue,
      scores: scores as unknown as Prisma.InputJsonValue,
      resultKey,
      categoryScores: categoryScores as unknown as Prisma.InputJsonValue,
    },
  });
}

export type CreateOfficialAttemptParams = {
  testKey: PersonalityTestKey;
  userId: string;
  guestId: string;
  answers: PersonalityTestAnswer[];
};

/**
 * For a user who is already authenticated the first time they take the
 * test -- never goes through the guest/claim mechanism below, since
 * there's no guest state to migrate. Writes the attempt as already-claimed
 * and official, and stamps User.personalityAnimal, in one transaction.
 * Throws PersonalityAnimalAlreadyAssignedError if the user already has a
 * permanent result (personalityAnimal is set once and never overwritten).
 */
export async function createOfficialPersonalityTestAttemptForUser({
  testKey,
  userId,
  guestId,
  answers,
}: CreateOfficialAttemptParams) {
  const { scores, resultKey, categoryScores } = computeResult(answers);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { personalityAnimal: true } });
    if (user?.personalityAnimal) {
      throw new PersonalityAnimalAlreadyAssignedError(`User ${userId} already has a personality animal assigned`);
    }

    const now = new Date();

    const attempt = await tx.personalityTestAttempt.create({
      data: {
        testKey,
        guestId,
        answers: answers as unknown as Prisma.InputJsonValue,
        scores: scores as unknown as Prisma.InputJsonValue,
        resultKey,
        categoryScores: categoryScores as unknown as Prisma.InputJsonValue,
        claimedByUserId: userId,
        claimedAt: now,
        isOfficial: true,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { personalityAnimal: resultKey, personalityAnimalSetAt: now },
    });

    return attempt;
  });
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
 * permanent animal (same "set once, never overwritten" rule the direct-
 * submit path enforces, for a user who already has one and then plays
 * again as a guest before logging back in). Every candidate row still gets
 * claimedByUserId/claimedAt stamped regardless, so history is never lost
 * even when it doesn't become official.
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
        data: { personalityAnimal: winner.resultKey, personalityAnimalSetAt: now },
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
