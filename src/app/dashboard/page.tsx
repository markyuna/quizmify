import { redirect } from "next/navigation";
import {
  Brain,
  Clock3,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";

import DetailsDialog from "@/components/DetailsDialog";
import HistoryCard from "@/components/dashboard/HistoryCard";
import HotTopicsCard from "@/components/dashboard/HotTopicsCard";
import QuizMeCard from "@/components/dashboard/QuizMeCard";
import RecentActivityCard from "@/components/dashboard/RecentActivityCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const statCards = [
  {
    key: "attempts",
    title: "Total Quizzes Completed",
    icon: Brain,
    accent:
      "from-violet-500/20 via-fuchsia-500/10 to-transparent text-violet-500 dark:text-violet-300",
  },
  {
    key: "accuracy",
    title: "Accuracy",
    icon: Target,
    accent:
      "from-cyan-500/20 via-sky-500/10 to-transparent text-cyan-500 dark:text-cyan-300",
  },
  {
    key: "score",
    title: "Average Score",
    icon: Trophy,
    accent:
      "from-amber-500/20 via-orange-500/10 to-transparent text-amber-500 dark:text-amber-300",
  },
  {
    key: "time",
    title: "Average Time / Quiz",
    icon: Clock3,
    accent:
      "from-emerald-500/20 via-teal-500/10 to-transparent text-emerald-500 dark:text-emerald-300",
  },
] as const;

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [
    attempts,
    attemptsCount,
    gamesCount,
    totalCorrectAggregate,
    totalAnsweredAggregate,
    totalTimeAggregate,
    recentAttempts,
    lastGame,
    mistakesCount,
  ] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId },
      select: {
        id: true,
        score: true,
        correctAnswers: true,
        totalQuestions: true,
        timeSpent: true,
        createdAt: true,
        game: {
          select: {
            id: true,
            topic: true,
            gameType: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.attempt.count({
      where: { userId },
    }),

    prisma.game.count({
      where: { userId },
    }),

    prisma.attempt.aggregate({
      where: { userId },
      _sum: {
        correctAnswers: true,
      },
    }),

    prisma.attempt.aggregate({
      where: { userId },
      _sum: {
        totalQuestions: true,
      },
    }),

    prisma.attempt.aggregate({
      where: { userId },
      _sum: {
        timeSpent: true,
      },
    }),

    prisma.attempt.findMany({
      where: { userId },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        score: true,
        createdAt: true,
        correctAnswers: true,
        totalQuestions: true,
        game: {
          select: {
            id: true,
            topic: true,
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

    prisma.attemptAnswer.count({
      where: {
        isCorrect: false,
        attempt: {
          userId,
        },
      },
    }),
  ]);

  const totalCorrect = totalCorrectAggregate._sum.correctAnswers ?? 0;
  const totalAnswered = totalAnsweredAggregate._sum.totalQuestions ?? 0;
  const totalTimeSpent = totalTimeAggregate._sum.timeSpent ?? 0;

  const accuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const averageScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((acc, attempt) => acc + attempt.score, 0) /
            attempts.length
        )
      : 0;

  const averageTimePerQuiz =
    attemptsCount > 0 ? Math.round(totalTimeSpent / attemptsCount) : 0;

  const bestAttempt =
    attempts.length > 0
      ? attempts.reduce((best, current) =>
          current.score > best.score ? current : best
        )
      : null;

  const stats = {
    attempts: {
      value: attemptsCount.toString(),
      subtitle: `${gamesCount} quizzes created overall`,
    },
    accuracy: {
      value: `${accuracy}%`,
      subtitle: `${totalCorrect} correct answers out of ${totalAnswered}`,
    },
    score: {
      value: `${averageScore}%`,
      subtitle: `Best run: ${bestAttempt ? `${bestAttempt.score}%` : "—"}`,
    },
    time: {
      value: formatSeconds(averageTimePerQuiz),
      subtitle: `Total study time: ${formatSeconds(totalTimeSpent)}`,
    },
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/60 p-6 shadow-2xl shadow-black/5 backdrop-blur-xl dark:bg-white/5 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              Performance overview
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Dashboard
              </h1>
              <DetailsDialog />
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Track your progress, review recent quiz results, and keep building
              momentum with a cleaner, smarter learning workflow.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <div className="rounded-2xl border border-white/10 bg-white/50 px-4 py-3 text-sm backdrop-blur-xl dark:bg-white/5">
              <p className="text-muted-foreground">Quizzes done</p>
              <p className="mt-1 text-lg font-bold">{attemptsCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/50 px-4 py-3 text-sm backdrop-blur-xl dark:bg-white/5">
              <p className="text-muted-foreground">Best score</p>
              <p className="mt-1 text-lg font-bold">
                {bestAttempt ? `${bestAttempt.score}%` : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          const stat = stats[item.key];

          return (
            <Card
              key={item.key}
              className="group relative overflow-hidden rounded-[1.75rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:bg-white/5"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent}`}
              />
              <CardHeader className="relative z-10 flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {item.title}
                  </CardTitle>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/60 shadow-sm backdrop-blur-xl dark:bg-white/5">
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold tracking-tight">
                  {stat.value}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2 items-stretch">
        <div className="h-full">
          <QuizMeCard
            lastTopic={lastGame?.topic ?? null}
            hasMistakes={mistakesCount > 0}
          />
        </div>

        <div className="h-full">
          <HistoryCard />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4 h-full">
          <HotTopicsCard />
        </div>

        <div className="lg:col-span-3 ">
          <Card className="relative h-full overflow-hidden rounded-[1.75rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 dark:bg-white/5">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-violet-500/10" />

            <CardHeader className="relative z-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">
                  Recent Quiz Results
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your latest quiz performance at a glance.
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/60 shadow-sm backdrop-blur-xl dark:bg-white/5">
                <TrendingUp className="h-5 w-5 text-fuchsia-400" />
              </div>
            </CardHeader>

            <CardContent className="relative z-10">
              {recentAttempts.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/40 p-6 text-center backdrop-blur-xl dark:bg-white/5">
                  <div className="max-w-sm space-y-2">
                    <p className="text-sm font-semibold">No quiz attempts yet</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Start your first quiz and your recent results will appear
                      here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAttempts.map((attempt) => {
                    const topic = attempt.game?.topic ?? "Untitled quiz";
                    const progress =
                      attempt.totalQuestions > 0
                        ? Math.round(
                            (attempt.correctAnswers / attempt.totalQuestions) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        key={attempt.id}
                        className="rounded-[1.25rem] border border-white/10 bg-white/50 p-4 shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-white/70 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{topic}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(attempt.createdAt)}
                            </p>
                          </div>

                          <div className="shrink-0 rounded-full border border-white/10 bg-white/70 px-3 py-1 text-sm font-semibold backdrop-blur-xl dark:bg-white/10">
                            {attempt.score}%
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {attempt.correctAnswers}/{attempt.totalQuestions}{" "}
                              correct
                            </span>
                            <span>{progress}%</span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-6">
        <RecentActivityCard />
      </section>
    </main>
  );
}