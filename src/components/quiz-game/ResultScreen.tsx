"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Lock, RotateCcw, XCircle, Zap } from "lucide-react";

import CountUp from "@/components/CountUp";
import { Button } from "@/components/ui/button";
import { confettiQuizComplete } from "@/lib/confettiBurst";
import type { QuizGameAnswerRecord, QuizGameQuestion } from "@/hooks/useQuizGame";

type SubmitOutcome = {
  earnedXp: number;
  newLevel: number;
  hitFreeLimit: boolean;
  correctAnswers: number;
  neuronsProgress: { neuronsEarned: number; correctTowardNext: number; neededForNext: number } | null;
};

type ResultScreenProps = {
  score: number;
  bestStreak: number;
  answers: QuizGameAnswerRecord[];
  questions: QuizGameQuestion[];
  onPlayAgain: () => void;
  isSaving: boolean;
  submitOutcome: SubmitOutcome | null;
};

export default function ResultScreen({
  score,
  bestStreak,
  answers,
  questions,
  onPlayAgain,
  isSaving,
  submitOutcome,
}: ResultScreenProps) {
  const t = useTranslations("KahootQuiz");
  const tMcq = useTranslations("MCQ");

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  useEffect(() => {
    confettiQuizComplete();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-8 pt-2"
    >
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 p-6 text-center text-white shadow-2xl shadow-violet-500/25">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">{t("title")}</p>
        <CountUp
          value={score}
          duration={1.4}
          className="mt-2 block text-5xl font-black tabular-nums"
        />
        <p className="mt-1 text-sm font-medium text-white/80">{t("pointsLabel")}</p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <p className="text-2xl font-black">{accuracy}%</p>
            <p className="mt-0.5 text-xs text-white/70">{t("accuracyLabel")}</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <p className="text-2xl font-black">
              {correctCount}/{questions.length}
            </p>
            <p className="mt-0.5 text-xs text-white/70">{t("correctLabel")}</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <p className="text-2xl font-black">{bestStreak}</p>
            <p className="mt-0.5 text-xs text-white/70">{t("bestStreakLabel")}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("saving")}
          </>
        ) : submitOutcome && !submitOutcome.hitFreeLimit ? (
          <>
            <Zap className="h-4 w-4 text-amber-500" />+{submitOutcome.earnedXp} XP · {tMcq("level")} {submitOutcome.newLevel}
          </>
        ) : submitOutcome?.hitFreeLimit ? (
          <>
            <Lock className="h-4 w-4 text-violet-500" />
            {tMcq("freeLimitReached")} —{" "}
            <Link href="/upgrade" className="font-bold text-violet-600 underline dark:text-violet-400">
              {tMcq("upgradeToPro")}
            </Link>
          </>
        ) : null}
      </div>

      {submitOutcome?.neuronsProgress && submitOutcome.correctAnswers > 0 && (
        <div className="flex items-center justify-center rounded-2xl border border-violet-200/60 bg-white/80 px-4 py-3 text-center text-sm font-semibold text-violet-700 backdrop-blur-xl dark:border-violet-500/20 dark:bg-white/5 dark:text-violet-300">
          {submitOutcome.neuronsProgress.neuronsEarned > 0
            ? t("neuronsBatchEarned", {
                neuronsEarned: submitOutcome.neuronsProgress.neuronsEarned,
                correctTowardNext: submitOutcome.neuronsProgress.correctTowardNext,
              })
            : t("neuronsBatchProgress", {
                correctAnswers: submitOutcome.correctAnswers,
                correctTowardNext: submitOutcome.neuronsProgress.correctTowardNext,
              })}
        </div>
      )}

      <Button
        onClick={onPlayAgain}
        className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/20 hover:opacity-95"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        {t("playAgain")}
      </Button>

      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {t("summaryTitle")}
        </p>
        <ul className="space-y-2">
          {questions.map((question, index) => {
            const record = answers.find((a) => a.questionId === question.id);
            const isCorrect = record?.isCorrect ?? false;

            return (
              <li
                key={question.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-200/60 bg-slate-50/60 px-3 py-2.5 dark:border-white/5 dark:bg-white/3"
              >
                {isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                )}
                <span className="min-w-0 break-words text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-semibold text-slate-400 dark:text-slate-500">
                    {t("questionAbbrev")}
                    {index + 1}.{" "}
                  </span>
                  {question.question}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
