import { redirect } from "next/navigation";

import AccuracyCard from "@/components/statistics/AccuracyCard";
import QuestionsList from "@/components/statistics/QuestionsList";
import ResultsCard from "@/components/statistics/ResultsCard";
import TimeTakenCard from "@/components/statistics/TimeTakenCard";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

type StatisticsPageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export const metadata = {
  title: "Statistics | Quizmify",
};

export default async function StatisticsPage({
  params,
}: StatisticsPageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  const { gameId } = await params;

  if (!gameId) {
    redirect("/quiz");
  }

  const game = await prisma.game.findUnique({
    where: {
      id: gameId,
    },
    include: {
      questions: {
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!game || game.userId !== session.user.id) {
    redirect("/quiz");
  }

  const questions = game.questions ?? [];
  const totalQuestions = questions.length;

  const correctAnswers = questions.filter(
    (question) => question.isCorrect === true
  ).length;

  const accuracy =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

  const timeEnded = game.timeEnded ?? new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">
            Quiz Statistics
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl dark:text-white">
            {game.topic}
          </h1>

          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Aquí tienes el resumen de tu partida.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-4">
            <TimeTakenCard
              timeStarted={game.timeStarted}
              timeEnded={timeEnded}
            />
          </div>

          <div className="md:col-span-3">
            <AccuracyCard accuracy={accuracy} />
          </div>

          <div className="md:col-span-5">
            <ResultsCard accuracy={accuracy} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Question Review
            </h2>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
              Score final:{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {correctAnswers} / {totalQuestions}
              </span>
            </div>
          </div>

          <QuestionsList questions={questions} />
        </div>
      </div>
    </div>
  );
}