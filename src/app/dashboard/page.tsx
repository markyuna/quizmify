import { redirect } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  Brain,
  Clock3,
  Crown,
  Flame,
  Sparkles,
  Target,
  Trophy,
  Zap,
  Lock,
} from "lucide-react";

import DetailsDialog from "@/components/DetailsDialog";
import LevelUpPaywallWrapper from "@/components/LevelUpPaywallWrapper";
import ProStatusBanner from "@/components/dashboard/ProStatusBanner";
import Avatar3D from "@/components/avatar/Avatar3D";
import { getAvatarSkinById } from "@/lib/avatarSkins";
import HistoryCard from "@/components/dashboard/HistoryCard";
import HotTopicsCard from "@/components/dashboard/HotTopicsCard";
import QuizMeCard from "@/components/dashboard/QuizMeCard";
import TrophyCabinetCard from "@/components/dashboard/TrophyCabinetCard";
import CertificatesCard from "@/components/dashboard/CertificatesCard";
import RecommendationCard from "@/components/dashboard/RecommendationCard";
import PersonalityMascotCard from "@/components/dashboard/PersonalityMascotCard";
import NeuronsInfoTooltip from "@/components/dashboard/NeuronsInfoTooltip";
import DailyChallengeCard from "@/components/dashboard/DailyChallengeCard";
import LeaderboardCard from "@/components/dashboard/LeaderboardCard";
import FriendsCard from "@/components/dashboard/FriendsCard";
import ReferralsCard from "@/components/dashboard/ReferralsCard";
import TrialOfferButton from "@/components/TrialOfferButton";
import { FREE_TRIAL_DAYS } from "@/lib/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getLevelProgress, xpRequiredForLevel } from "@/lib/xp";
import { FREE_XP_CAP, FREE_LEVEL_CAP } from "@/lib/stripe";
import { getEffectiveLevel, isLevelFrozen } from "@/lib/pro";
import { isEffectivelyPro } from "@/lib/paywall";
import { resolvePaywallMessage } from "@/lib/paywallMessages";
import { getEffectiveStreak, getProtectionsRemaining } from "@/lib/streak";
import { getNeuronsProgress } from "@/lib/neurons";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Dashboard | Quizmify",
  description: "Track your activity and start new quizzes.",
};

function formatSeconds(seconds: number) {
  if (!seconds || seconds <= 0) return "0s";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className="group relative overflow-hidden rounded-[1.5rem] border-white/10 bg-white/60 shadow-lg shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:bg-white/5">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`}
      />

      <CardHeader className="relative z-10 flex flex-row items-start justify-between space-y-0 p-4 pb-2 sm:p-5 sm:pb-3">
        <div className="min-w-0">
          <CardTitle className="text-xs font-medium leading-5 text-muted-foreground sm:text-sm">
            {title}
          </CardTitle>
        </div>

        <div className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/60 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:h-11 sm:w-11">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-4 pt-0 sm:p-5 sm:pt-0">
        <div className="text-2xl font-bold tracking-tight sm:text-3xl">
          {value}
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await getAuthSession();
  const t = await getTranslations("Dashboard");
  const tTrial = await getTranslations("Trial");
  const tNeurons = await getTranslations("NeuronHistory");
  const tRoot = await getTranslations();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const statCards = [
    {
      key: "attempts",
      title: t("statAttemptsTitle"),
      icon: Brain,
      accent:
        "from-violet-500/20 via-fuchsia-500/10 to-transparent text-violet-500 dark:text-violet-300",
    },
    {
      key: "accuracy",
      title: t("statAccuracyTitle"),
      icon: Target,
      accent:
        "from-cyan-500/20 via-sky-500/10 to-transparent text-cyan-500 dark:text-cyan-300",
    },
    {
      key: "score",
      title: t("statScoreTitle"),
      icon: Trophy,
      accent:
        "from-amber-500/20 via-orange-500/10 to-transparent text-amber-500 dark:text-amber-300",
    },
    {
      key: "time",
      title: t("statTimeTitle"),
      icon: Clock3,
      accent:
        "from-emerald-500/20 via-teal-500/10 to-transparent text-emerald-500 dark:text-emerald-300",
    },
  ] as const;

  const [
    userProfile,
    attemptsAggregate,
    gamesCount,
    recentAttempts,
    lastGame,
    mistakesCount,
    neuronsProgress,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        name: true,
        subscriptionStatus: true,
        premiumUntil: true,
        freeTrialUsedAt: true,
        neuronsBalance: true,
        selectedSkinId: true,
        currentStreak: true,
        lastQuizDate: true,
        streakProtectionsUsed: true,
        streakProtectionMonth: true,
      },
    }),

    prisma.attempt.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { correctAnswers: true, totalQuestions: true, timeSpent: true },
      _avg: { score: true },
      _max: { score: true },
    }),

    prisma.game.count({
      where: { userId },
    }),

    prisma.attempt.findMany({
      where: { userId },
      take: 6,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        score: true,
        createdAt: true,
        correctAnswers: true,
        totalQuestions: true,
        timeSpent: true,
        game: {
          select: {
            id: true,
            topic: true,
            gameType: true,
          },
        },
      },
    }),

    prisma.game.findFirst({
      where: {
        userId,
        topic: {
          notIn: ["Practice Mistakes"],
        },
      },
      orderBy: {
        timeStarted: "desc",
      },
      select: {
        topic: true,
      },
    }),

    prisma.userQuestionProgress.count({
      where: { userId, needsReview: true },
    }),

    getNeuronsProgress(prisma, userId),
  ]);

  const totalXp = userProfile?.xp ?? 0;
  const neuronsBalance = userProfile?.neuronsBalance ?? 0;
  // Derived from xp + Pro status rather than the stored `level` column, so
  // an upgrade restores the user's real level immediately instead of only
  // after their next quiz rewrites that column.
  const currentLevel = userProfile ? getEffectiveLevel(userProfile) : 1;
  const isPro = userProfile ? isEffectivelyPro(userProfile) : false;
  // Mirrors isUserAtFreeLimit's threshold: free-tier xp is permanently
  // clamped to FREE_XP_CAP - 1 by /api/quiz/submit, so that's the real cap.
  const isAtFreeLimit = !isPro && totalXp >= FREE_XP_CAP - 1;
  const trialAvailable = isAtFreeLimit && !userProfile?.freeTrialUsedAt;
  // A user whose Pro lapsed keeps their real level in `xp` but displays at
  // the cap, so their progress bar has to be pinned to the cap too --
  // otherwise the header reads "Level 2" next to level-5 progress numbers.
  // ProStatusBanner is what tells them the real level is still saved.
  const levelIsFrozen = userProfile ? isLevelFrozen(userProfile) : false;
  const cappedLevelProgress = {
    xpIntoCurrentLevel: xpRequiredForLevel(FREE_LEVEL_CAP),
    xpPerLevel: xpRequiredForLevel(FREE_LEVEL_CAP),
    xpToNextLevel: 0,
    progressPercent: 100,
  };
  const levelProgress = levelIsFrozen ? cappedLevelProgress : getLevelProgress(totalXp);

  const currentStreak = userProfile ? getEffectiveStreak(userProfile) : 0;
  const protectionsRemaining = isPro && userProfile ? getProtectionsRemaining(userProfile) : 0;
  // Only actually apply the equipped skin while Pro -- selection itself
  // persists through a lapse, it just stops rendering until they're Pro again.
  const equippedSkin = isPro ? getAvatarSkinById(userProfile?.selectedSkinId) : null;

  const attemptsCount = attemptsAggregate._count._all;

  const resolvedPaywallMessage = isAtFreeLimit
    ? (() => {
        const ctx = {
          quizzesPlayed: attemptsCount,
          currentStreak,
          usedFreeTrial: userProfile?.freeTrialUsedAt != null,
          usedStreakProtection: (userProfile?.streakProtectionsUsed ?? 0) > 0,
        };
        const variant = resolvePaywallMessage(ctx);
        return { key: variant.messageKey, values: variant.values(ctx) };
      })()
    : null;

  const totalCorrect = attemptsAggregate._sum.correctAnswers ?? 0;
  const totalAnswered = attemptsAggregate._sum.totalQuestions ?? 0;
  const totalTimeSpent = attemptsAggregate._sum.timeSpent ?? 0;
  const averageScore = Math.round(attemptsAggregate._avg.score ?? 0);
  const bestScore = attemptsAggregate._max.score ?? null;

  const accuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const averageTimePerQuiz =
    attemptsCount > 0 ? Math.round(totalTimeSpent / attemptsCount) : 0;

  const stats = {
    attempts: {
      value: attemptsCount.toString(),
      subtitle: t("statAttemptsSubtitle", { count: gamesCount }),
    },
    accuracy: {
      value: `${accuracy}%`,
      subtitle: t("statAccuracySubtitle", { correct: totalCorrect, total: totalAnswered }),
    },
    score: {
      value: `${averageScore}%`,
      subtitle: t("statScoreSubtitle", { best: bestScore !== null ? `${bestScore}%` : "—" }),
    },
    time: {
      value: formatSeconds(averageTimePerQuiz),
      subtitle: t("statTimeSubtitle", { total: formatSeconds(totalTimeSpent) }),
    },
  };

  return (
    <div className="w-full overflow-x-hidden px-0 pb-8 pt-3 sm:pb-10 sm:pt-5">
      {/* Level 3 paywall modal for Free users */}
      <LevelUpPaywallWrapper userXp={totalXp} isPro={isPro} />

      {userProfile && <ProStatusBanner user={userProfile} />}

      <section
        className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/60 bg-[url('/images/dashboard_background_light.webp')] bg-cover bg-center bg-fixed p-4 shadow-2xl shadow-black/5 backdrop-blur-xl dark:bg-[url('/images/dashboard_background.webp')] dark:bg-white/5 sm:rounded-[2rem] sm:p-6 lg:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
        <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-violet-500/15 blur-3xl sm:h-40 sm:w-40" />
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl sm:h-40 sm:w-40" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5 sm:mb-4 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              {t("performanceOverview")}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                {t("title")}
              </h1>
              <DetailsDialog />
              <span
                className={
                  isPro
                    ? "inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-400/15 to-amber-500/15 px-3 py-1 text-xs font-bold text-amber-600 dark:border-amber-400/30 dark:text-amber-300"
                    : "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                }
              >
                <Crown className="h-3.5 w-3.5" />
                {isPro ? t("proStatus") : t("freeStatus")}
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {t("subtitle")}
            </p>

            <div className="mt-5 max-w-xl rounded-[1.5rem] border border-white/10 bg-white/60 p-4 shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-white/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar3D level={currentLevel} size={72} className="rounded-full" skin={equippedSkin} />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-violet-500 dark:text-violet-300">
                      {t("levelProgress")}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {t("level")} {currentLevel}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("xpToNextLevel", { xp: totalXp, toGo: levelProgress.xpToNextLevel, nextLevel: currentLevel + 1 })}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="shrink-0 rounded-2xl border border-white/10 bg-white/70 px-4 py-3 text-center backdrop-blur-xl dark:bg-white/10">
                    <p className="text-xs text-muted-foreground">{t("xp")}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {totalXp}
                    </p>
                  </div>

                  {/* Neurons keep accruing even for Pro (earning has no Pro
                      check), so the card always renders -- just dimmed and
                      neutral-toned for Pro, since they don't currently need
                      to spend the balance. */}
                  <div
                    className={cn(
                      "shrink-0 rounded-2xl border px-4 py-3 text-center backdrop-blur-xl",
                      isPro
                        ? "border-white/10 bg-white/40 opacity-60 dark:bg-white/5"
                        : "border-white/10 bg-white/70 dark:bg-white/10"
                    )}
                  >
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      {t("neurons")}
                      <NeuronsInfoTooltip isPro={isPro} />
                    </p>
                    <p className="flex items-center justify-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                      <Image src="/icono-neurona/neurona-hex-48.png" alt="" width={20} height={20} />
                      {neuronsBalance}
                    </p>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                        style={{
                          width: `${(neuronsProgress.correctTowardNext / neuronsProgress.neededForNext) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t("neuronsProgress", {
                        correct: neuronsProgress.correctTowardNext,
                        needed: neuronsProgress.neededForNext,
                      })}
                    </p>
                    <a
                      href="/neurons"
                      className="mt-1 inline-block text-[11px] font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-300"
                    >
                      {tNeurons("viewHistory")}
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{levelProgress.xpIntoCurrentLevel}/{levelProgress.xpPerLevel} XP</span>
                  <span>{Math.round(levelProgress.progressPercent)}%</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${levelProgress.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[320px]">
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 px-3 py-3 text-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-amber-500/10 sm:px-4">
              <p className="flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                {t("streak")}
              </p>
              <p className="mt-1 text-lg font-bold sm:text-xl">
                {currentStreak}
              </p>
              {isPro && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("protectionsRemaining", { count: protectionsRemaining })}
                </p>
              )}
            </div>

            <PersonalityMascotCard userId={userId} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2">
        <div className="order-1 min-w-0">
          <QuizMeCard
            lastTopic={lastGame?.topic ?? null}
            hasMistakes={mistakesCount > 0}
          />
        </div>

        <div className="order-2 min-w-0">
          <HistoryCard userId={userId} attemptsCount={attemptsCount} attempts={recentAttempts} />
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2">
        <DailyChallengeCard userId={userId} />
        <RecommendationCard userId={userId} />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const stat = stats[item.key];
          return (
            <StatCard
              key={item.key}
              title={item.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={item.icon}
              accent={item.accent}
            />
          );
        })}
      </section>

      <section className="mt-4 sm:mt-6">
        <HotTopicsCard />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2">
        <TrophyCabinetCard userId={userId} />
        <CertificatesCard userId={userId} />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2">
        <LeaderboardCard userId={userId} />
        <FriendsCard userId={userId} />
      </section>

      <section className="mt-4 sm:mt-6">
        <ReferralsCard userId={userId} />
      </section>

      {isAtFreeLimit && (
        <section className="mt-4 sm:mt-6">
          <div className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 p-px shadow-2xl shadow-violet-500/20">
            <div className="flex flex-col gap-4 rounded-[1.7rem] bg-slate-900 p-6 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-950">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-300">{t("freeLimitReached")}</p>
                  <p className="mt-0.5 text-lg font-bold text-white">{t("atLevel2")}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {resolvedPaywallMessage ? tRoot(resolvedPaywallMessage.key, resolvedPaywallMessage.values) : t("upgradePrompt")}
                  </p>
                </div>
              </div>

              {trialAvailable ? (
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                  <TrialOfferButton
                    days={FREE_TRIAL_DAYS}
                    className="h-auto rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white hover:opacity-90"
                  />
                  <a href="/upgrade" className="text-xs font-medium text-white/50 hover:text-white/80">
                    {tTrial("orUpgrade")}
                  </a>
                </div>
              ) : (
                <a
                  href="/upgrade"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  <Zap className="h-4 w-4" />
                  {t("upgradeToPro")}
                </a>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}