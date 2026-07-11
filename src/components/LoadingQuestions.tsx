"use client";

import * as React from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { BrainCircuit, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Progress } from "./ui/progress";

type LoadingQuestionsProps = {
  finished: boolean;
};

export default function LoadingQuestions({
  finished,
}: LoadingQuestionsProps) {
  const t = useTranslations("LoadingQuestions");
  const loadingTexts = t.raw("loadingTexts") as string[];
  const loadingBadges = t.raw("loadingBadges") as string[];

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
  }, [finished, loadingTexts.length, loadingBadges.length]);

  const loadingText = loadingTexts[textIndex];

  const statusItems = [
    { label: t("status"), value: finished ? t("finalizing") : t("generating") },
    { label: t("engine"), value: t("engineValue") },
    { label: t("output"), value: t("outputValue") },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-black/5 bg-white/70 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-2xl dark:border-white/10 dark:bg-black/40 dark:shadow-violet-950/20 sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.08),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_35%)]" />

          <div className="relative z-10">
            {/* Badges: single-row chip strip, scrolls on mobile instead of wrapping */}
            <div className="no-scrollbar mb-5 flex items-center gap-1.5 overflow-x-auto">
              {loadingBadges.map((badge, index) => {
                const isActive = index === activeBadge;

                return (
                  <motion.span
                    key={badge}
                    animate={{ opacity: isActive ? 1 : 0.5, scale: isActive ? 1.03 : 1 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0 whitespace-nowrap rounded-full border border-black/5 bg-white/75 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                  >
                    {badge}
                  </motion.span>
                );
              })}
            </div>

            {/* Icon + status text, side by side instead of a large centered stack */}
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-500/15"
                >
                  <BrainCircuit className="h-6 w-6 text-violet-600 dark:text-violet-300" />
                </motion.div>

                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow dark:bg-slate-900"
                >
                  <Sparkles className="h-3 w-3 text-cyan-500 dark:text-cyan-300" />
                </motion.div>
              </div>

              <div className="min-w-0">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingText}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="text-balance text-base font-semibold leading-snug text-slate-900 dark:text-white sm:text-lg"
                  >
                    {loadingText}
                  </motion.p>
                </AnimatePresence>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-white/40">
                  {t("engineValue")} · {t("mayTakeAFewSeconds")}
                </p>
              </div>
            </div>

            {/* Progress: thin bar, label + percent on one line above */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600 dark:text-white/70">
                <span>{t("preparingYourQuiz")}</span>
                <span className="font-semibold tabular-nums">{Math.round(progress)}%</span>
              </div>

              <Progress
                value={progress}
                className="h-1.5 w-full bg-slate-200 dark:bg-white/10"
                indicatorClassName="animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 motion-reduce:animate-none"
              />
            </div>

            {/* Status cards: compact 3-col row */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {statusItems.map((item) => (
                <div
                  key={item.label}
                  className="min-w-0 rounded-xl border border-black/5 bg-white/75 px-2.5 py-2 text-left backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                >
                  <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-white/40">
                    {item.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-slate-800 dark:text-white/85">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </MotionConfig>
  );
}
