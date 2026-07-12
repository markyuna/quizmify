import { prisma } from "@/lib/db";
import { FREE_XP_CAP } from "@/lib/stripe";

/**
 * Single source of truth for "does this user currently get Pro treatment,"
 * whether that's a real paid subscription or temporary access granted by a
 * referral reward or the free trial. Every Pro gate in the app should read
 * through this (or isUserPro/isUserAtFreeLimit below) rather than checking
 * subscriptionStatus directly, so referrals/trials actually unlock
 * everything a paid Pro user gets -- not just the XP cap.
 */
export function isEffectivelyPro(
  user: { subscriptionStatus: string; premiumUntil: Date | null },
  now: Date = new Date()
): boolean {
  if (user.subscriptionStatus === "pro") return true;
  return user.premiumUntil !== null && user.premiumUntil > now;
}

/**
 * Single source of truth for the free-tier quiz creation cap. Always reads
 * xp/subscriptionStatus fresh from the database — never trust a client-supplied
 * value for this check.
 */
export async function isUserAtFreeLimit(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, subscriptionStatus: true, premiumUntil: true },
  });

  if (!user) return false;

  // /api/quiz/submit deliberately never lets a free user's stored xp reach
  // FREE_XP_CAP — it clamps back down to FREE_XP_CAP - 1 the instant that
  // threshold would be crossed (see submit/route.ts), so FREE_XP_CAP - 1 is
  // the real, permanent ceiling for free accounts. Checking `>= FREE_XP_CAP`
  // here would never be true and the cap would never engage.
  return !isEffectivelyPro(user) && user.xp >= FREE_XP_CAP - 1;
}

/**
 * Single source of truth for Pro-only features (e.g. PDF export) that
 * aren't tied to the free XP cap at all -- always reads subscriptionStatus
 * fresh from the database, never trust a client-supplied value.
 */
export async function isUserPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, premiumUntil: true },
  });

  return user !== null && isEffectivelyPro(user);
}
