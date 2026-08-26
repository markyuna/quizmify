"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useTranslations } from "next-intl";

import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

const PHASE_COUNT = 3;
const TEXT_ROTATE_MS = 2500;

type LoadingQuestionsProps = {
  finished: boolean;
  /** Real generation progress (0-100), if the backend ever exposes one.
   * Falls back to a simulated curve that eases off and never reaches 100%
   * on its own -- only `finished` can do that. */
  progress?: number;
  /** Rotating status phrases. Defaults to the LoadingQuestions translation
   * namespace's own array -- pass this to reuse the logo/progress chrome
   * for a different kind of generation (e.g. an image, not questions)
   * without that context's copy reading like a quiz is being built. */
  loadingTexts?: string[];
  /** Defaults to the LoadingQuestions namespace's own secondary line. */
  secondaryLine?: string;
};

export default function LoadingQuestions({
  finished,
  progress: realProgress,
  loadingTexts: loadingTextsProp,
  secondaryLine: secondaryLineProp,
}: LoadingQuestionsProps) {
  const t = useTranslations("LoadingQuestions");
  const loadingTexts = loadingTextsProp ?? (t.raw("loadingTexts") as string[]);
  const secondaryLine = secondaryLineProp ?? t("secondaryLine");

  const [simulatedProgress, setSimulatedProgress] = React.useState(0);
  const [textIndex, setTextIndex] = React.useState(0);

  const hasRealProgress = typeof realProgress === "number";
  const progress = finished ? 100 : hasRealProgress ? Math.min(realProgress, 99) : simulatedProgress;

  React.useEffect(() => {
    if (finished || hasRealProgress) return;

    const interval = setInterval(() => {
      setSimulatedProgress((prev) => {
        const step = prev < 35 ? 1.6 : prev < 65 ? 0.9 : prev < 85 ? 0.45 : 0.2;
        return Math.min(prev + step, 95);
      });
    }, 120);

    return () => clearInterval(interval);
  }, [finished, hasRealProgress]);

  React.useEffect(() => {
    if (finished) return;

    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, TEXT_ROTATE_MS);

    return () => clearInterval(interval);
  }, [finished, loadingTexts.length]);

  const loadingText = loadingTexts[textIndex];
  const litPhases =
    progress <= 0 ? 0 : Math.min(PHASE_COUNT, Math.ceil(progress / (100 / PHASE_COUNT)));

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-xs flex-col items-center text-center">
          {/* Logo: floating focal point with radar-pulse rings */}
          <div className="relative flex h-28 w-28 items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border border-violet-400/50 dark:border-violet-400/40"
                initial={{ scale: 0.6, opacity: 0.5 }}
                animate={{ scale: [0.6, 1.6], opacity: [0.5, 0] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: i * 0.8,
                }}
              />
            ))}

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-20 w-20 items-center justify-center rounded-full border border-black/5 bg-white/80 shadow-xl shadow-violet-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
            >
              <Image src="/logo.png" alt="" width={44} height={44} priority />
            </motion.div>
          </div>

          {/* Status line: single rotating phrase, crossfade */}
          <div className="mt-7 flex h-6 items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingText}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                {loadingText}
              </motion.p>
            </AnimatePresence>
          </div>

          <p className="mt-1 text-xs text-slate-500 dark:text-white/40">{secondaryLine}</p>

          {/* Progress: thin single-color bar */}
          <div className="mt-6 w-full">
            <Progress
              value={progress}
              className="h-[5px] w-full bg-slate-200 dark:bg-white/10"
              indicatorClassName="bg-violet-500 transition-[transform] duration-300 ease-out dark:bg-violet-400"
            />
          </div>

          {/* Phase dots */}
          <div className="mt-3 flex items-center gap-1.5">
            {Array.from({ length: PHASE_COUNT }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                  i < litPhases ? "bg-violet-500 dark:bg-violet-400" : "bg-slate-300 dark:bg-white/15"
                )}
              />
            ))}
          </div>
        </div>
      </main>
    </MotionConfig>
  );
}
