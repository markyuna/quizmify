import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Gift, Users, Calendar, Crown } from "lucide-react";

import { getAuthSession } from "@/lib/nextauth";
import { getReferralStats } from "@/lib/referrals";
import { REFERRAL_REWARD_DAYS } from "@/lib/premium";
import ReferralLinkCard from "@/components/ReferralLinkCard";

export const metadata = {
  title: "Referrals | Quizmify",
  description: "Invite friends and earn free Pro time.",
};

function daysRemaining(premiumUntil: Date | null, now: Date): number {
  if (!premiumUntil || premiumUntil <= now) return 0;
  return Math.ceil((premiumUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export default async function ReferralsPage() {
  const session = await getAuthSession();
  const t = await getTranslations("Referrals");

  if (!session?.user?.id) {
    redirect("/login");
  }

  const stats = await getReferralStats(session.user.id);
  const appUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const referralLink = `${appUrl}/register?ref=${session.user.id}`;
  const remainingDays = daysRemaining(stats.premiumUntil, new Date());

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
          <Gift className="h-3.5 w-3.5" />
          {t("badge")}
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {t("subtitle", { days: REFERRAL_REWARD_DAYS })}
        </p>
      </div>

      <div className="space-y-4">
        <ReferralLinkCard referralLink={referralLink} />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <Users className="mx-auto h-5 w-5 text-violet-500" />
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{stats.referralCount}</p>
            <p className="text-xs text-slate-400">{t("referralCount")}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <Calendar className="mx-auto h-5 w-5 text-cyan-500" />
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{stats.totalDaysEarned}</p>
            <p className="text-xs text-slate-400">{t("daysEarned")}</p>
          </div>
        </div>

        {!stats.isPro && (
          <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
            <Crown className="mx-auto h-5 w-5 text-amber-500" />
            <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
              {remainingDays > 0 ? t("premiumActive", { days: remainingDays }) : t("noPremiumActive")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
