"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type TimerBarProps = {
  remainingMs: number;
  timeLimitMs: number;
};

export default function TimerBar({ remainingMs, timeLimitMs }: TimerBarProps) {
  const shouldReduceMotion = useReducedMotion();
  const fraction = timeLimitMs > 0 ? Math.max(0, Math.min(1, remainingMs / timeLimitMs)) : 0;
  const isUrgent = fraction <= 0.25;

  return (
    <div className="flex items-center gap-2">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <motion.div
          className={cn(
            "h-full rounded-full",
            isUrgent ? "bg-rose-500" : "bg-gradient-to-r from-violet-500 to-cyan-500"
          )}
          animate={{ width: `${fraction * 100}%` }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.15, ease: "linear" }}
        />
      </div>
      <span
        className={cn(
          "w-8 shrink-0 text-right text-sm font-bold tabular-nums",
          isUrgent ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"
        )}
      >
        {Math.ceil(remainingMs / 1000)}s
      </span>
    </div>
  );
}
