import { prisma } from "@/lib/db";
import { FREE_XP_CAP } from "@/lib/stripe";

/**
 * Single source of truth for the free-tier quiz creation cap. Always reads
 * xp/subscriptionStatus fresh from the database — never trust a client-supplied
 * value for this check.
 */
export async function isUserAtFreeLimit(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, subscriptionStatus: true },
  });

  if (!user) return false;

  const isPro = user.subscriptionStatus === "pro";

  // /api/quiz/submit deliberately never lets a free user's stored xp reach
  // FREE_XP_CAP — it clamps back down to FREE_XP_CAP - 1 the instant that
  // threshold would be crossed (see submit/route.ts), so FREE_XP_CAP - 1 is
  // the real, permanent ceiling for free accounts. Checking `>= FREE_XP_CAP`
  // here would never be true and the cap would never engage.
  return !isPro && user.xp >= FREE_XP_CAP - 1;
}

/**
 * Single source of truth for Pro-only features (e.g. PDF export) that
 * aren't tied to the free XP cap at all -- always reads subscriptionStatus
 * fresh from the database, never trust a client-supplied value.
 */
export async function isUserPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });

  return user?.subscriptionStatus === "pro";
}
