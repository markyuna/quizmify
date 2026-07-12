import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/** Days of temporary Pro access granted to both sides of a successful referral. */
export const REFERRAL_REWARD_DAYS = 7;

/** Days of temporary Pro access granted by the one-time free trial. */
export const FREE_TRIAL_DAYS = 7;

/** How long before a trial expires to send the upgrade-offer email. */
export const TRIAL_EXPIRY_WARNING_HOURS = 24;

/**
 * Extends a user's temporary Pro window by `days`, stacking on top of
 * whatever's left of any existing grant rather than overwriting it -- two
 * referral rewards should add up, not clobber each other. If premiumUntil
 * is null or already in the past, the new window starts from `now`.
 */
export async function grantPremiumDays(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  days: number,
  now: Date = new Date()
): Promise<Date> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { premiumUntil: true } });
  const base = user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
  const premiumUntil = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await tx.user.update({ where: { id: userId }, data: { premiumUntil } });
  return premiumUntil;
}
