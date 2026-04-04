"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Sparkles, Wand2 } from "lucide-react";
import { Progress } from "./ui/progress";

type LoadingQuestionsProps = {
  finished: boolean;
};

const loadingTexts = [
  "Generating intelligent question sets...",
  "Analyzing topic depth and difficulty...",
  "Designing a sharper learning experience...",
  "Structuring questions for better recall...",
  "Optimizing your next quiz session...",
];

const loadingBadges = [
  "AI reasoning",
  "Topic mapping",
  "Adaptive generation",
  "Precision prompts",
];

export default function LoadingQuestions({
  finished,
}: LoadingQuestionsProps) {
  const [progress, setProgress] = React.useState(0);
  const [textIndex, setTextIndex] = React.useState(0);
  const [activeBadge, setActiveBadge] = React.useState(0);

  React.useEffect(() => {
    if (finished) {
      setProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const step =
          prev < 35 ? 1.6 : prev < 65 ? 0.9 : prev < 85 ? 0.45 : 0.2;

        return Math.min(prev + step, 95);
      });
    }, 120);

    return () => clearInterval(interval);
  }, [finished]);

  React.useEffect(() => {
    if (finished) return;

    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
      setActiveBadge((prev) => (prev + 1) % loadingBadges.length);
    }, 2200);

    return () => clearInterval(interval);
  }, [finished]);

  const loadingText = loadingTexts[textIndex];

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-black/5 bg-white/70 p-8 shadow-2xl shadow-slate-200/60 backdrop-blur-2xl dark:border-white/10 dark:bg-black/40 dark:shadow-violet-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_28%),radial-gradient(circle_at_bottom,rgba(217,70,239,0.08),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_bottom,rgba(217,70,239,0.10),transparent_30%)]" />

        <div className="pointer-events-none absolute left-10 top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-16 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-8 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            {loadingBadges.map((badge, index) => {
              const isActive = index === activeBadge;

              return (
                <motion.span
                  key={badge}
                  animate={{
                    opacity: isActive ? 1 : 0.5,
                    scale: isActive ? 1.04 : 1,
                  }}
                  transition={{ duration: 0.25 }}
                  className="rounded-full border border-black/5 bg-white/75 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                >
                  {badge}
                </motion.span>
              );
            })}
          </div>

          <div className="relative mb-8 flex h-52 w-52 items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute h-52 w-52 rounded-full border border-violet-400/20"
            />

            <motion.div
              animate={{ rotate: -360 }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute h-40 w-40 rounded-full border border-cyan-400/20"
            />

            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute h-28 w-28 rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-cyan-400/30 blur-xl"
            />

            <motion.div
              animate={{ y: [0, -5, 0], rotate: [0, 4, -4, 0] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-black/5 bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            >
              <BrainCircuit className="h-10 w-10 text-violet-500 dark:text-violet-300" />
            </motion.div>

            <motion.div
              animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.15, 1] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute left-6 top-10"
            >
              <Sparkles className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
            </motion.div>

            <motion.div
              animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.6,
              }}
              className="absolute bottom-8 right-8"
            >
              <Wand2 className="h-5 w-5 text-fuchsia-500 dark:text-fuchsia-300" />
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            <motion.h1
              key={loadingText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="max-w-xl text-balance text-2xl font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              {loadingText}
            </motion.h1>
          </AnimatePresence>

          <p className="mt-2 text-xs text-slate-500 dark:text-white/40">
            This may take a few seconds depending on complexity.
          </p>

          <div className="mt-8 w-full max-w-xl">
            <div className="mb-3 flex items-center justify-between text-sm text-slate-600 dark:text-white/70">
              <span>Preparing your quiz</span>
              <span>{Math.round(progress)}%</span>
            </div>

            <Progress
              value={progress}
              className="h-2.5 w-full bg-slate-200 dark:bg-white/10"
              indicatorClassName="bg-[length:200%_100%] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_0_20px_rgba(168,85,247,0.35)] animate-[shimmer_2.2s_linear_infinite]"
            />
          </div>

          <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/5 bg-white/75 px-4 py-3 text-left backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-white/40">
                Status
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white/85">
                {finished ? "Finalizing" : "Generating"}
              </p>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white/75 px-4 py-3 text-left backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-white/40">
                Engine
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white/85">
                Adaptive AI
              </p>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white/75 px-4 py-3 text-left backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-white/40">
                Output
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white/85">
                Quiz questions
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}