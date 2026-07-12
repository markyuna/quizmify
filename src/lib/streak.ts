import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isEffectivelyPro } from "@/lib/paywall";

export const STREAK_PROTECTIONS_PER_MONTH = 2;

type StreakFields = {
  currentStreak: number;
  longestStreak: number;
  lastQuizDate: Date | null;
  subscriptionStatus: string;
  premiumUntil: Date | null;
  streakProtectionsUsed: number;
  streakProtectionMonth: string | null;
};

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  isNewRecord: boolean;
  streakExtended: boolean;
  streakProtected: boolean;
  streakReset: boolean;
  protectionsRemaining: number;
};

function toUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcDaysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((toUtcDayStart(to).getTime() - toUtcDayStart(from).getTime()) / MS_PER_DAY);
}

function currentMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Records a day of quiz activity and updates the user's streak. Must only be
 * called once per completed quiz (the caller is responsible for idempotency
 * -- see /api/quiz/submit's existingAttempt guard). All inputs are read
 * fresh from the database inside the caller's transaction; nothing here
 * trusts a client-supplied streak value.
 */
export async function registerQuizActivity(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  now: Date = new Date()
): Promise<StreakResult> {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastQuizDate: true,
      subscriptionStatus: true,
      premiumUntil: true,
      streakProtectionsUsed: true,
      streakProtectionMonth: true,
    },
  });

  const { currentStreak, protectionsUsedThisMonth, streakExtended, streakProtected, streakReset } =
    computeNextStreak(user, now);

  const longestStreak = Math.max(user.longestStreak, currentStreak);
  const isNewRecord = longestStreak > user.longestStreak;

  await tx.user.update({
    where: { id: userId },
    data: {
      currentStreak,
      longestStreak,
      lastQuizDate: now,
      streakProtectionsUsed: protectionsUsedThisMonth,
      streakProtectionMonth: currentMonthKey(now),
    },
  });

  return {
    currentStreak,
    longestStreak,
    isNewRecord,
    streakExtended,
    streakProtected,
    streakReset,
    protectionsRemaining: STREAK_PROTECTIONS_PER_MONTH - protectionsUsedThisMonth,
  };
}

function computeNextStreak(user: StreakFields, now: Date) {
  const monthKey = currentMonthKey(now);
  const protectionsUsedThisMonth =
    user.streakProtectionMonth === monthKey ? user.streakProtectionsUsed : 0;

  if (!user.lastQuizDate) {
    return {
      currentStreak: 1,
      protectionsUsedThisMonth,
      streakExtended: false,
      streakProtected: false,
      streakReset: false,
    };
  }

  const gapDays = utcDaysBetween(user.lastQuizDate, now);

  if (gapDays <= 0) {
    // Already played today (or a clock skew edge case) -- no change.
    return {
      currentStreak: user.currentStreak,
      protectionsUsedThisMonth,
      streakExtended: false,
      streakProtected: false,
      streakReset: false,
    };
  }

  if (gapDays === 1) {
    return {
      currentStreak: user.currentStreak + 1,
      protectionsUsedThisMonth,
      streakExtended: true,
      streakProtected: false,
      streakReset: false,
    };
  }

  // gapDays >= 2: at least one full day missed.
  const isPro = isEffectivelyPro(user);
  const hasProtectionAvailable = isPro && protectionsUsedThisMonth < STREAK_PROTECTIONS_PER_MONTH;

  if (hasProtectionAvailable) {
    return {
      currentStreak: user.currentStreak + 1,
      protectionsUsedThisMonth: protectionsUsedThisMonth + 1,
      streakExtended: false,
      streakProtected: true,
      streakReset: false,
    };
  }

  return {
    currentStreak: 1,
    protectionsUsedThisMonth,
    streakExtended: false,
    streakProtected: false,
    streakReset: true,
  };
}

/** Read-only: protections left in the current calendar month, for display. */
export function getProtectionsRemaining(
  user: Pick<StreakFields, "streakProtectionsUsed" | "streakProtectionMonth">,
  now: Date = new Date()
): number {
  const usedThisMonth =
    user.streakProtectionMonth === currentMonthKey(now) ? user.streakProtectionsUsed : 0;
  return Math.max(0, STREAK_PROTECTIONS_PER_MONTH - usedThisMonth);
}

/**
 * Read-only projection for display: if more than a day has passed since the
 * user's last quiz, their streak has effectively lapsed even though the
 * stored value won't be reset until they play again (resets are only ever
 * written on the activity path, in registerQuizActivity). Never mutates.
 */
export function getEffectiveStreak(
  user: Pick<StreakFields, "currentStreak" | "lastQuizDate">,
  now: Date = new Date()
): number {
  if (!user.lastQuizDate) return 0;
  const gapDays = utcDaysBetween(user.lastQuizDate, now);
  return gapDays <= 1 ? user.currentStreak : 0;
}
