import type { Prisma } from "@/generated/prisma/client";
import { GuestGameKey } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";
import { registerQuizActivity } from "@/lib/streak";
import { calculateEarnedXpBreakdown, calculateLevel } from "@/lib/xp";
import { FREE_LEVEL_CAP } from "@/lib/stripe";
import type { Locale } from "@/i18n/locales";

export { GuestGameKey };

export const GUEST_GAME_KEYS = Object.values(GuestGameKey);

export function isGuestGameKey(value: string): value is GuestGameKey {
  return (GUEST_GAME_KEYS as readonly string[]).includes(value);
}

/** UTC calendar day as "YYYY-MM-DD" -- same idiom as getTodayDateKey in dailyChallenge.ts. */
export function getTodayDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * A guestId is minted client-side (see useGuestRound.ts) and stashed in a
 * cookie, mirroring the quizmify_ref referral cookie. It's never PII and
 * carries no privilege -- it's only a partition key for "one attempt per
 * guest per game per day," so validation here is just a sanity bound
 * against abuse/storage bloat, not a security boundary.
 */
export function isValidGuestId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(value);
}

type JsonRecord = Record<string, unknown>;

/**
 * Per-game plug-in: each of the 3 games registers its own challenge
 * generation and grading here, but never touches the shared plumbing above
 * (daily rotation, one-attempt guard, guest persistence, claim/migration).
 * `payload` is the full challenge including its answer key -- grade() sees
 * it, but toClientChallenge() must strip anything that would let the answer
 * leak to the browser before the guest submits.
 */
export type GuestGameDefinition<TPayload extends JsonRecord = JsonRecord, TAnswer = unknown> = {
  gameKey: GuestGameKey;
  generateChallenge(dateKey: string, language: Locale): Promise<TPayload> | TPayload;
  toClientChallenge(payload: TPayload): JsonRecord;
  grade(payload: TPayload, answer: TAnswer): { isCorrect: boolean; resultPayload: JsonRecord };
};

const registry = new Map<GuestGameKey, GuestGameDefinition>();

export function registerGuestGame(definition: GuestGameDefinition) {
  registry.set(definition.gameKey, definition);
}

function getGuestGame(gameKey: GuestGameKey): GuestGameDefinition {
  const definition = registry.get(gameKey);
  if (!definition) {
    throw new Error(`No guest game registered for "${gameKey}" yet`);
  }
  return definition;
}

/** Whether a gameKey currently has a real generator/grader registered (vs. Phase 1's "coming soon" cards). */
export function isGuestGameImplemented(gameKey: GuestGameKey): boolean {
  return registry.has(gameKey);
}

/**
 * Returns today's shared challenge for this game+language, generating and
 * persisting it on first access. Race-safe the same way
 * getOrCreateTodaysChallenge is: a losing concurrent insert just re-fetches
 * the winner's row instead of erroring.
 */
export async function getOrCreateTodaysGuestChallenge(
  gameKey: GuestGameKey,
  language: Locale,
  now: Date = new Date()
) {
  const dateKey = getTodayDateKey(now);
  const where = { gameKey_date_language: { gameKey, date: dateKey, language } };

  const existing = await prisma.dailyGameChallenge.findUnique({ where });
  if (existing) return existing;

  const definition = getGuestGame(gameKey);
  const payload = await definition.generateChallenge(dateKey, language);

  try {
    return await prisma.dailyGameChallenge.create({
      data: {
        gameKey,
        date: dateKey,
        language,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  } catch {
    const winner = await prisma.dailyGameChallenge.findUnique({ where });
    if (!winner) throw new Error(`Failed to create or fetch today's ${gameKey} challenge`);
    return winner;
  }
}

/** Flat completion+correctness formula shared with regular quizzes -- a guest round is a 1-question attempt. */
function computeGuestXp(isCorrect: boolean): number {
  return calculateEarnedXpBreakdown({ correctAnswers: isCorrect ? 1 : 0, totalQuestions: 1 }).totalXp;
}

export type SubmitGuestAttemptParams = {
  gameKey: GuestGameKey;
  language: Locale;
  guestId: string;
  answer: unknown;
  now?: Date;
};

/**
 * Grades a guest's answer server-side (the client never sees the answer key
 * ahead of time) and persists the attempt. The [challengeId, guestId]
 * unique constraint is the real one-attempt-per-day guard; an already-
 * existing attempt is returned as-is rather than re-graded, so a guest
 * can't retry by resubmitting.
 */
export async function submitGuestAttempt({ gameKey, language, guestId, answer, now = new Date() }: SubmitGuestAttemptParams) {
  const dateKey = getTodayDateKey(now);
  const challenge = await getOrCreateTodaysGuestChallenge(gameKey, language, now);

  const existing = await prisma.guestAttempt.findUnique({
    where: { challengeId_guestId: { challengeId: challenge.id, guestId } },
  });
  if (existing) {
    return { attempt: existing, alreadyPlayed: true as const };
  }

  const definition = getGuestGame(gameKey);
  const { isCorrect, resultPayload } = definition.grade(challenge.payload as JsonRecord, answer);
  const xpEarned = computeGuestXp(isCorrect);

  try {
    const attempt = await prisma.guestAttempt.create({
      data: {
        challengeId: challenge.id,
        gameKey,
        date: dateKey,
        guestId,
        resultPayload: resultPayload as Prisma.InputJsonValue,
        isCorrect,
        xpEarned,
      },
    });
    return { attempt, alreadyPlayed: false as const };
  } catch {
    // Two submits raced (double-click, retry) -- the loser just reads the winner's row.
    const winner = await prisma.guestAttempt.findUnique({
      where: { challengeId_guestId: { challengeId: challenge.id, guestId } },
    });
    if (!winner) throw new Error("Failed to create or fetch guest attempt");
    return { attempt: winner, alreadyPlayed: true as const };
  }
}

export async function getTodaysClientChallenge(
  gameKey: GuestGameKey,
  language: Locale,
  guestId: string | null,
  now: Date = new Date()
) {
  const challenge = await getOrCreateTodaysGuestChallenge(gameKey, language, now);
  const definition = getGuestGame(gameKey);

  const attempted = guestId
    ? (await prisma.guestAttempt.count({
        where: { challengeId: challenge.id, guestId },
      })) > 0
    : false;

  return {
    challengeId: challenge.id,
    date: challenge.date,
    challenge: definition.toClientChallenge(challenge.payload as JsonRecord),
    attempted,
  };
}

export type ClaimGuestAttemptsResult = {
  claimedCount: number;
  xpAwarded: number;
};

/**
 * Migrates every not-yet-claimed guest attempt for guestId onto userId:
 * awards the summed XP and starts the shared streak (registerQuizActivity),
 * called once regardless of how many of the 3 games the guest played --
 * one registration event is one day of activity, not one per game. Safe to
 * call repeatedly (e.g. GuestRoundClaim retrying): once a row is claimed it
 * never gets claimed or paid out again, and calling with nothing left to
 * claim is a no-op.
 *
 * Race-safe against two concurrent claims for the same guestId (e.g. a
 * duplicate retry firing before the first one committed): the update is
 * scoped to claimedByUserId: null, so Postgres row locking guarantees only
 * one transaction can flip a given row from null, and XP is summed only
 * over the rows this call actually won.
 */
export async function claimGuestAttempts(
  userId: string,
  guestId: string,
  now: Date = new Date()
): Promise<ClaimGuestAttemptsResult> {
  return prisma.$transaction(async (tx) => {
    const candidates = await tx.guestAttempt.findMany({
      where: { guestId, claimedByUserId: null },
      select: { id: true },
    });

    if (candidates.length === 0) {
      return { claimedCount: 0, xpAwarded: 0 };
    }

    const ids = candidates.map((row) => row.id);

    const claimResult = await tx.guestAttempt.updateMany({
      where: { id: { in: ids }, claimedByUserId: null },
      data: { claimedByUserId: userId, claimedAt: now },
    });

    if (claimResult.count === 0) {
      return { claimedCount: 0, xpAwarded: 0 };
    }

    const claimedRows = await tx.guestAttempt.findMany({
      where: { id: { in: ids }, claimedByUserId: userId },
      select: { xpEarned: true },
    });
    const xpAwarded = claimedRows.reduce((sum, row) => sum + row.xpEarned, 0);

    const previousUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { level: true, subscriptionStatus: true, premiumUntil: true },
    });

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: xpAwarded } },
      select: { xp: true },
    });

    // Mirrors /api/daily-challenge/submit and /api/quiz/submit: a brand-new
    // account is never Pro, so its level is capped the same as any other
    // free user's -- xp itself is never clamped.
    const trueLevel = calculateLevel(updatedUser.xp);
    const newLevel = Math.min(trueLevel, FREE_LEVEL_CAP);
    if (newLevel !== previousUser.level) {
      await tx.user.update({ where: { id: userId }, data: { level: newLevel } });
    }

    await registerQuizActivity(tx, userId, now);

    return { claimedCount: claimedRows.length, xpAwarded };
  });
}
