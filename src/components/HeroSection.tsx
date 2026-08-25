"use client";

import Link from "next/link";
import { motion, MotionConfig, type Variants } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import QuizSearchHero from "@/components/QuizSearchHero";

type HeroSectionProps = {
  isAuthenticated: boolean;
  popularTopics?: string[];
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function HeroSection({ isAuthenticated, popularTopics }: HeroSectionProps) {
  const t = useTranslations("Home");

  return (
    <MotionConfig reducedMotion="user">
      {/* pt-6/md:pt-10 here, not pt-24/pt-32 -- layout.tsx's <main> already
          adds pt-24 to clear the fixed Navbar; stacking this section's own
          pt-24/pt-32 on top of that doubled the gap under the navbar. */}
      <section className="relative overflow-hidden px-4 pb-16 pt-6 md:px-8 md:pb-24 md:pt-10">
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

          {/* Right — Quiz search */}
          <motion.div variants={fadeUp} className="relative z-10">
            <QuizSearchHero popularTopics={popularTopics} />
          </motion.div>
        </motion.div>
      </section>
    </MotionConfig>
  );
}
