import type { Prisma } from "@/generated/prisma/client";
import { PersonalityTestKey } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";
import { computeResult, type PersonalityTestAnswer } from "./scoring";

export { PersonalityTestKey };

export const PERSONALITY_TEST_KEYS = Object.values(PersonalityTestKey);

export function isPersonalityTestKey(value: string): value is PersonalityTestKey {
  return (PERSONALITY_TEST_KEYS as readonly string[]).includes(value);
}

export type CreateAttemptParams = {
  testKey: PersonalityTestKey;
  guestId: string;
  answers: PersonalityTestAnswer[];
};

/**
 * Scores a guest's answers server-side and persists the attempt -- no
 * one-attempt guard here (unlike GuestAttempt), retaking an evergreen
 * personality test is expected, so every submit creates a new row.
 */
export async function createPersonalityTestAttempt({ testKey, guestId, answers }: CreateAttemptParams) {
  const { scores, resultKey } = computeResult(answers);

  return prisma.personalityTestAttempt.create({
    data: {
      testKey,
      guestId,
      answers: answers as unknown as Prisma.InputJsonValue,
      scores: scores as unknown as Prisma.InputJsonValue,
      resultKey,
    },
  });
}

export type ClaimPersonalityTestAttemptsResult = {
  claimedCount: number;
  latestAttemptId: string | null;
};

/**
 * Migrates every not-yet-claimed personality-test attempt for guestId onto
 * userId. Mirrors claimGuestAttempts in guestPlay.ts, minus the XP/streak
 * side effects (a personality test isn't part of the XP loop). Returns the
 * most recently created claimed attempt so the caller can route straight to
 * its result page.
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

    const claimResult = await tx.personalityTestAttempt.updateMany({
      where: { id: { in: ids }, claimedByUserId: null },
      data: { claimedByUserId: userId, claimedAt: now },
    });

    if (claimResult.count === 0) {
      return { claimedCount: 0, latestAttemptId: null };
    }

    return { claimedCount: claimResult.count, latestAttemptId: ids[0] };
  });
}

/** Only returns a claimed attempt -- an unclaimed one's result stays hidden until registration. */
export async function getClaimedPersonalityTestAttempt(id: string) {
  const attempt = await prisma.personalityTestAttempt.findUnique({ where: { id } });
  if (!attempt || !attempt.claimedByUserId) return null;
  return attempt;
}
