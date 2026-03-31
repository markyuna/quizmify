import { prisma } from "@/lib/db";
import { Clock, CopyCheck, Edit2, Target, Trophy } from "lucide-react";
import Link from "next/link";
import React from "react";
import { formatTimeDelta } from "@/lib/utils";

type Props = {
  limit: number;
  userId: string;
};

const HistoryComponent = async ({ limit, userId }: Props) => {
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
    },
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
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
        No quiz attempts yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {attempts.map((attempt) => {
        const gameType = attempt.game?.gameType ?? "mcq";
        const topic = attempt.game?.topic ?? "Untitled quiz";
        const gameId = attempt.game?.id;

        return (
          <div
            className="flex items-start justify-between rounded-2xl border border-border/50 p-4 transition-colors hover:bg-muted/40"
            key={attempt.id}
          >
            <div className="flex items-start">
              {gameType === "mcq" ? (
                <CopyCheck className="mr-3 mt-1 h-5 w-5" />
              ) : (
                <Edit2 className="mr-3 mt-1 h-5 w-5" />
              )}

              <div className="ml-2 space-y-2">
                {gameId ? (
                  <Link
                    href={`/statistics/${gameId}`}
                    className="text-base font-medium leading-none underline"
                  >
                    {topic}
                  </Link>
                ) : (
                  <p className="text-base font-medium leading-none">
                    {topic}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex items-center rounded-lg bg-slate-800 px-2 py-1 text-xs text-white">
                    <Clock className="mr-1 h-4 w-4" />
                    {new Date(attempt.createdAt).toLocaleDateString()}
                  </p>

                  <p className="rounded-lg border px-2 py-1 text-xs text-muted-foreground">
                    {gameType === "mcq" ? "MCQ" : "Open Ended"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    {attempt.score}%
                  </p>

                  <p className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {attempt.correctAnswers}/{attempt.totalQuestions} correct
                  </p>

                  <p className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatTimeDelta(attempt.timeSpent)}
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