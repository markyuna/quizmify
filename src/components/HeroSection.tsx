"use client";

import Link from "next/link";
import { motion, MotionConfig, type Variants } from "framer-motion";
import {
  ArrowRight,
  Award,
  BrainCircuit,
  CheckCircle2,
  Sparkles,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import CountUp from "@/components/CountUp";
import { cn } from "@/lib/utils";

type HeroSectionProps = {
  isAuthenticated: boolean;
};

// Numbers, not code syntax like the old JSON.parse() mock -- language-neutral,
// so no i18n needed for the options themselves. An octopus really does have
// three hearts.
const ANSWER_OPTIONS = [
  { letter: "A", label: "1", correct: false },
  { letter: "B", label: "2", correct: false },
  { letter: "C", label: "3", correct: true },
  { letter: "D", label: "9", correct: false },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function HeroSection({ isAuthenticated }: HeroSectionProps) {
  const t = useTranslations("Home");

  return (
    <MotionConfig reducedMotion="user">
      <section className="relative overflow-hidden px-4 pb-16 pt-24 md:px-8 md:pb-24 md:pt-32">
        {/* Background depth: subtle dot grid + slow-drifting blurred blobs,
            all behind the content and never competing with it. */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-40 dark:opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(100,116,139,0.35) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, 18, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/20"
          />
          <motion.div
            animate={{ x: [0, -25, 0], y: [0, 22, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-10 top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/20"
          />
          <motion.div
            animate={{ x: [0, 20, 0], y: [0, -18, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-fuchsia-400/15 blur-3xl dark:bg-fuchsia-500/15"
          />
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2"
        >
          {/* Left — copy */}
          <div className="relative z-10">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            >
              <motion.span
                animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex"
              >
                <Sparkles className="h-4 w-4 text-violet-500" />
              </motion.span>
              {t("heroBadge")}
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl dark:text-white"
            >
              {t.rich("heroTitle", {
                highlight: (chunks) => (
                  <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                    {chunks}
                  </span>
                ),
              })}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300"
            >
              {t("heroSubtitle")}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl" className="relative overflow-hidden">
                <Link href={isAuthenticated ? "/quiz" : "/login"}>
                  <span
                    aria-hidden
                    className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/25 motion-reduce:hidden"
                  />
                  {isAuthenticated ? t("ctaCreateQuiz") : t("ctaGetStarted")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="/history">{t("ctaViewHistory")}</Link>
              </Button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {t("checkAiQuizzes")}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {t("checkPerformance")}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {t("checkMistakes")}
              </div>
            </motion.div>
          </div>

          {/* Right — quiz preview mockup */}
          <motion.div variants={fadeUp} className="relative z-10">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-cyan-500/20 blur-2xl" />

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.015 }}
              className="relative rounded-[2rem] bg-white/70 p-1 shadow-[0_30px_60px_-15px_rgba(124,58,237,0.3)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_35px_70px_-15px_rgba(124,58,237,0.4)] dark:border dark:border-white/10 dark:bg-white/5"
            >
              {/* Titlebar: dot mesh over the gradient, glass icon, timer that
                  only pulses when it'd realistically be running low. */}
              <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-5 py-4">
                <div
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
                    backgroundSize: "14px 14px",
                  }}
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/30 bg-white/15 backdrop-blur-md">
                      <BrainCircuit className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white/70">{t("mockQuizInProgress")}</p>
                      <p className="text-sm font-bold text-white">{t("mockTopic")}</p>
                    </div>
                  </div>

                  <motion.div
                    animate={{
                      scale: [1, 1, 1, 1.08, 1],
                    }}
                    transition={{ duration: 8, repeat: Infinity, times: [0, 0.7, 0.85, 0.92, 1] }}
                    className="flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1.5 backdrop-blur"
                  >
                    <Timer className="h-3.5 w-3.5 text-white" />
                    <span className="text-sm font-bold tabular-nums text-white">01:42</span>
                  </motion.div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Progress */}
                <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{t("mockQuestionCounter")}</span>
                  <span>30%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="h-full w-[30%] rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
                </div>

                {/* Question */}
                <div className="rounded-2xl border border-slate-200/60 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">{t("mockQuestionLabel")}</p>
                  <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                    {t("mockQuestion")}
                  </p>

                  <div className="mt-3 space-y-2">
                    {ANSWER_OPTIONS.map((opt) => (
                      <div
                        key={opt.letter}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors duration-200",
                          opt.correct
                            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/15"
                            : "border-slate-200 bg-slate-50/80 hover:border-violet-200 hover:bg-violet-50/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                              opt.correct
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                            )}
                          >
                            {opt.letter}
                          </span>
                          <span
                            className={cn(
                              "text-sm font-medium",
                              opt.correct ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"
                            )}
                          >
                            {opt.label}
                          </span>
                        </span>

                        {opt.correct && (
                          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                            <motion.span
                              initial={{ scale: 0.5, opacity: 0.6 }}
                              animate={{ scale: 2, opacity: 0 }}
                              transition={{ duration: 0.9, ease: "easeOut" }}
                              className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 motion-reduce:hidden"
                            />
                            <motion.span
                              initial={{ scale: 0.4, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.35, delay: 0.2 }}
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </motion.span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats row — icons in colored circles, numbers count up once
                    scrolled into view; XP/Level lean into their accent color
                    to read as "achievement", Score stays neutral. */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center rounded-2xl border border-amber-200/60 bg-amber-50/80 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <CountUp value={2} className="mt-1 text-base font-black text-slate-700 dark:text-slate-200" />
                    <p className="text-[10px] text-slate-400">{t("mockScore")}</p>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl border border-violet-200/60 bg-violet-50/80 py-2.5 dark:border-violet-500/20 dark:bg-violet-500/10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15">
                      <Zap className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <CountUp
                      value={20}
                      prefix="+"
                      className="mt-1 text-base font-black text-violet-600 dark:text-violet-300"
                    />
                    <p className="text-[10px] text-slate-400">{t("mockXp")}</p>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl border border-cyan-200/60 bg-cyan-50/80 py-2.5 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/15">
                      <Award className="h-3.5 w-3.5 text-cyan-500" />
                    </div>
                    <CountUp value={3} className="mt-1 text-base font-black text-cyan-600 dark:text-cyan-300" />
                    <p className="text-[10px] text-slate-400">{t("mockLevel")}</p>
                  </div>
                </div>

                {/* Next button — same shine sweep as the main hero CTA */}
                <button
                  disabled
                  className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3 text-sm font-bold text-white opacity-90"
                >
                  <span
                    aria-hidden
                    className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/25 motion-reduce:hidden"
                  />
                  {t("mockNextQuestion")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>
    </MotionConfig>
  );
}
