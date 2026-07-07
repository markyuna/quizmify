import { prisma } from "@/lib/db";
import { Clock, CopyCheck, Edit2, Target, Trophy } from "lucide-react";
import Link from "next/link";
import React from "react";
import { cn, formatTimeDelta } from "@/lib/utils";

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

function getScoreStyle(score: number) {
  if (score >= 80)
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 50)
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-rose-500/15 text-rose-400 border-rose-500/30";
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const HistoryComponent = async ({ limit, userId, data }: Props) => {
  const attempts: AttemptItem[] =
    data ??
    (await prisma.attempt.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        game: {
          select: { id: true, topic: true, gameType: true },
        },
      },
    }));

  if (attempts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
          <Trophy className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          No quiz attempts yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground/50">
          Complete your first quiz to see history here
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.06]">
      {attempts.map((attempt) => {
        const gameType = attempt.game?.gameType ?? "mcq";
        const topic = attempt.game?.topic ?? "Untitled quiz";
        const gameId = attempt.game?.id;

        return (
          <div
            key={attempt.id}
            className="flex items-center gap-3 px-1 py-3.5 transition-colors hover:bg-white/[0.03] sm:gap-4 sm:py-4"
          >
            {/* Icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 sm:h-10 sm:w-10 sm:rounded-2xl">
              {gameType === "mcq" ? (
                <CopyCheck className="h-4 w-4 text-violet-400 sm:h-5 sm:w-5" />
              ) : (
                <Edit2 className="h-4 w-4 text-violet-400 sm:h-5 sm:w-5" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              {gameId ? (
                <Link
                  href={`/statistics/${gameId}`}
                  className="block truncate text-sm font-semibold text-foreground/90 transition-colors hover:text-white sm:text-[15px]"
                  title={topic}
                >
                  {topic}
                </Link>
              ) : (
                <p
                  className="truncate text-sm font-semibold sm:text-[15px]"
                  title={topic}
                >
                  {topic}
                </p>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[11px] text-muted-foreground/60 sm:text-xs">
                  {formatDate(attempt.createdAt)}
                </span>

                <span className="text-muted-foreground/25">·</span>

                <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400 sm:text-[11px]">
                  {gameType === "mcq" ? "MCQ" : "Open Ended"}
                </span>

                <span className="text-muted-foreground/25">·</span>

                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 sm:text-xs">
                  <Target className="h-3 w-3 shrink-0" />
                  {attempt.correctAnswers}/{attempt.totalQuestions} correct
                </span>

                <span className="text-muted-foreground/25">·</span>

                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 sm:text-xs">
                  <Clock className="h-3 w-3 shrink-0" />
                  {formatTimeDelta(attempt.timeSpent)}
                </span>
              </div>
            </div>

            {/* Score badge */}
            <div className="shrink-0">
              <span
                className={cn(
                  "inline-flex items-center rounded-xl border px-2.5 py-1 text-sm font-bold tabular-nums sm:rounded-2xl sm:px-3 sm:text-[15px]",
                  getScoreStyle(attempt.score)
                )}
              >
                {attempt.score}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryComponent;
