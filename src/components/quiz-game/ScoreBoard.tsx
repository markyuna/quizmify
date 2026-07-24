"use client";

import { Flame, Trophy } from "lucide-react";

import CountUp from "@/components/CountUp";
import { cn } from "@/lib/utils";

type ScoreBoardProps = {
  score: number;
  streak: number;
};

export default function ScoreBoard({ score, streak }: ScoreBoardProps) {
  const multiplier = 1 + Math.min(streak, 9) * 0.1;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-500/20 dark:bg-amber-500/10">
        <Trophy className="h-4 w-4 text-amber-500" />
        <CountUp
          value={score}
          duration={0.5}
          className="text-sm font-black tabular-nums text-slate-900 dark:text-white"
        />
      </div>

      <div
        className={cn(
          "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 transition-colors",
          streak > 0
            ? "border-orange-300 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10"
            : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
        )}
      >
        <Flame
          className={cn(
            "h-4 w-4",
            streak > 0 ? "text-orange-500" : "text-slate-300 dark:text-slate-600"
          )}
        />
        <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white">
          {streak}
        </span>
        {streak >= 2 && (
          <span className="text-xs font-bold text-orange-600 dark:text-orange-300">
            ×{multiplier.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}
