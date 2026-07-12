import { prisma } from "@/lib/db";

export type ReferralStats = {
  referralCount: number;
  totalDaysEarned: number;
  premiumUntil: Date | null;
  isPro: boolean;
};

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const [referrals, user] = await Promise.all([
    prisma.referral.findMany({ where: { referrerId: userId }, select: { rewardDays: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { premiumUntil: true, subscriptionStatus: true } }),
  ]);

  return {
    referralCount: referrals.length,
    totalDaysEarned: referrals.reduce((sum, r) => sum + r.rewardDays, 0),
    premiumUntil: user?.premiumUntil ?? null,
    isPro: user?.subscriptionStatus === "pro",
  };
}
