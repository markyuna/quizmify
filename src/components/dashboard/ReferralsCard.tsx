import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { getReferralStats } from "@/lib/referrals";
import { REFERRAL_REWARD_DAYS } from "@/lib/premium";

export default async function ReferralsCard({ userId }: { userId: string }) {
  const t = await getTranslations("Referrals");
  const stats = await getReferralStats(userId);

  return (
    <Card className="group relative overflow-hidden rounded-[1.75rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.01] dark:bg-white/5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-fuchsia-500/10" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/15 blur-3xl" />

      <CardContent className="relative z-10 flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0 space-y-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5 sm:text-xs">
            <Gift className="h-3.5 w-3.5 text-amber-400" />
            {t("badge")}
          </div>
          <p className="text-sm text-foreground">{t("subtitle", { days: REFERRAL_REWARD_DAYS })}</p>
          {stats.referralCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("referralCount")}: {stats.referralCount} · {t("daysEarned")}: {stats.totalDaysEarned}
            </p>
          )}
        </div>

        <Link
          href="/referrals"
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition-opacity hover:opacity-90"
        >
          {t("title")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
