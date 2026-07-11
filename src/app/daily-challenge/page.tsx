import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Flame, Users, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

import DailyChallengeQuiz from "@/components/DailyChallengeQuiz";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getOrCreateTodaysChallenge, getDailyChallengeStats } from "@/lib/dailyChallenge";
import { getRequestLocale } from "@/i18n/get-locale";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Daily Challenge | Quizmify",
  description: "One shared quiz a day -- see how you stack up.",
};

export default async function DailyChallengePage() {
  const session = await getAuthSession();
  const t = await getTranslations("DailyChallenge");

  if (!session?.user?.id) {
    redirect("/login");
  }

  const locale = await getRequestLocale();
  const challenge = await getOrCreateTodaysChallenge(locale);

  const [existingAttempt, stats] = await Promise.all([
    prisma.dailyChallengeAttempt.findUnique({
      where: {
        dailyChallengeId_userId: { dailyChallengeId: challenge.id, userId: session.user.id },
      },
    }),
    getDailyChallengeStats(challenge.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <Flame className="h-3.5 w-3.5" />
          {t("badge")}
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {challenge.topic}
        </h1>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Users className="h-3.5 w-3.5" />
          {t("participantCount", { count: stats.participantCount })}
        </p>
      </div>

      {existingAttempt ? (
        <div className="mx-auto w-full max-w-xl rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-6 text-center shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t("alreadyPlayed")}</p>
          <p className="mt-2 text-2xl font-black text-amber-500">
            {t("xpEarned", { xp: existingAttempt.earnedXp })}
          </p>
          {existingAttempt.aboveAverageBonusXp > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />+{existingAttempt.aboveAverageBonusXp} XP {t("aboveAverageBonus")}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
              <p className="text-3xl font-black text-slate-900 dark:text-white">{existingAttempt.score}%</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t("yourScore")} · {existingAttempt.correctAnswers}/{existingAttempt.totalQuestions}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
              <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.averageScore}%</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("average")}</p>
            </div>
          </div>
          <div
            className={cn(
              "mt-3 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
              existingAttempt.score >= stats.averageScore
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            )}
          >
            {existingAttempt.score >= stats.averageScore ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {existingAttempt.score >= stats.averageScore
              ? t("aboveAverage", { diff: existingAttempt.score - stats.averageScore })
              : t("belowAverage", { diff: stats.averageScore - existingAttempt.score })}
          </div>
          <p className="mt-4 text-xs text-slate-400">{t("comeBackTomorrow")}</p>
        </div>
      ) : (
        <DailyChallengeQuiz
          dailyChallengeId={challenge.id}
          questions={challenge.questions.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
          }))}
        />
      )}
    </div>
  );
}
