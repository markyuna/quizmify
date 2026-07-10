import { prisma } from "@/lib/db";
import { Clock, CopyCheck, Edit2, Target, Trophy } from "lucide-react";
import Link from "next/link";
import React from "react";
import { getTranslations } from "next-intl/server";
import { formatTimeDelta } from "@/lib/utils";

export type AttemptItem = {
  id: string;
  score: number;
  createdAt: Date;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  game: {
    id: string;
    topic: string;
    gameType: string;
  } | null;
};

type Props = {
  limit: number;
  userId: string;
  data?: AttemptItem[];
};

const HistoryComponent = async ({ limit, userId, data }: Props) => {
  const t = await getTranslations("HistoryComponent");
  const attempts: AttemptItem[] = data ?? await prisma.attempt.findMany({
    where: { userId },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      game: {
        select: {
          id: true,
          topic: true,
          gameType: true,
        },
      },
    },
  });

  if (attempts.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        {t("noAttemptsYet")}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      {attempts.map((attempt) => {
        const gameType = attempt.game?.gameType ?? "mcq";
        const topic = attempt.game?.topic ?? t("untitledQuiz");
        const gameId = attempt.game?.id;

        return (
          <div
            key={attempt.id}
            className="min-w-0 rounded-2xl border border-border/50 p-3 transition-colors hover:bg-muted/40 sm:p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 pt-1">
                {gameType === "mcq" ? (
                  <CopyCheck className="h-5 w-5" />
                ) : (
                  <Edit2 className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                {gameId ? (
                  <Link
                    href={`/statistics/${gameId}`}
                    className="block truncate text-sm font-medium underline underline-offset-4 sm:text-base"
                    title={topic}
                  >
                    {topic}
                  </Link>
                ) : (
                  <p
                    className="truncate text-sm font-medium sm:text-base"
                    title={topic}
                  >
                    {topic}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <p className="inline-flex max-w-full items-center rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300 sm:text-xs">
                    <Clock className="mr-1 h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {new Date(attempt.createdAt).toLocaleDateString()}
                    </span>
                  </p>

                  <p className="inline-flex max-w-full items-center rounded-lg border px-2 py-1 text-[11px] text-muted-foreground sm:text-xs">
                    <span className="truncate">
                      {gameType === "mcq" ? t("mcq") : t("openEnded")}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground sm:text-sm">
                  <p className="inline-flex min-w-0 items-center gap-1">
                    <Trophy className="h-4 w-4 shrink-0" />
                    <span className="truncate">{attempt.score}%</span>
                  </p>

                  <p className="inline-flex min-w-0 items-center gap-1">
                    <Target className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {t("correctCount", { correct: attempt.correctAnswers, total: attempt.totalQuestions })}
                    </span>
                  </p>

                  <p className="inline-flex min-w-0 items-center gap-1">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {formatTimeDelta(attempt.timeSpent)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryComponent;
