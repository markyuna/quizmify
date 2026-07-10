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
  return !isPro && user.xp >= FREE_XP_CAP;
}
