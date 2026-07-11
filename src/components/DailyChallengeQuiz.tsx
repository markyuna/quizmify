"use client";

import * as React from "react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronRight, Loader2, Trophy, Users, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";

type DailyChallengeQuestion = {
  id: string;
  question: string;
  options: string[];
};

type DailyChallengeStats = {
  averageScore: number;
  participantCount: number;
};

type SubmitResponse = {
  success: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  stats: DailyChallengeStats;
  earnedXp: number;
  baseXp: number;
  aboveAverageBonusXp: number;
};

type DailyChallengeQuizProps = {
  dailyChallengeId: string;
  questions: DailyChallengeQuestion[];
};

export default function DailyChallengeQuiz({ dailyChallengeId, questions }: DailyChallengeQuizProps) {
  const { toast } = useToast();
  const t = useTranslations("DailyChallenge");

  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, string>>({});
  const [startedAt] = React.useState(() => new Date().getTime());
  const [result, setResult] = React.useState<SubmitResponse | null>(null);

  const currentQuestion = questions[questionIndex];
  const isLastQuestion = questionIndex === questions.length - 1;
  const selected = currentQuestion ? selectedAnswers[currentQuestion.id] ?? null : null;

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      const timeSpent = Math.round((new Date().getTime() - startedAt) / 1000);
      const response = await axios.post<SubmitResponse>("/api/daily-challenge/submit", {
        dailyChallengeId,
        timeSpent,
        answers: Object.entries(selectedAnswers).map(([questionId, selectedAnswer]) => ({
          questionId,
          selectedAnswer,
        })),
      });
      return response.data;
    },
    onSuccess: (data) => setResult(data),
    onError: () => {
      toast({ title: t("error"), description: t("unableToSubmit"), variant: "destructive" });
    },
  });

  const handleSelect = (option: string) => {
    if (isPending || result) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
  };

  const handleNext = () => {
    if (!selected) return;
    if (!isLastQuestion) {
      setQuestionIndex((prev) => prev + 1);
      return;
    }
    submit();
  };

  if (result) {
    const diff = result.score - result.stats.averageScore;
    return (
      <div className="mx-auto w-full max-w-xl rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="text-center">
          <Trophy className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{t("resultTitle")}</h2>
          <p className="mt-1 text-3xl font-black text-amber-500">{t("xpEarned", { xp: result.earnedXp })}</p>
          {result.aboveAverageBonusXp > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />+{result.aboveAverageBonusXp} XP {t("aboveAverageBonus")}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("comeBackTomorrow")}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-white/5">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{result.score}%</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t("yourScore")} · {result.correctAnswers}/{result.totalQuestions}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-white/5">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{result.stats.averageScore}%</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("average")}</p>
          </div>
        </div>

        <div
          className={cn(
            "mt-3 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
            diff >= 0
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          )}
        >
          {diff >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {diff >= 0
            ? t("aboveAverage", { diff })
            : t("belowAverage", { diff: Math.abs(diff) })}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Users className="h-3.5 w-3.5" />
          {t("participantCount", { count: result.stats.participantCount })}
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="mb-3 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
        {t("questionAbbrev")} {questionIndex + 1} / {questions.length}
      </p>

      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-6">
        <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white sm:text-xl">
          {currentQuestion.question}
        </h2>

        <div className="mt-4 space-y-2.5">
          {currentQuestion.options.map((option, index) => {
            const isSelected = option === selected;
            return (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => handleSelect(option)}
                disabled={isPending}
                className={cn(
                  "w-full rounded-2xl border px-4 py-4 text-left text-sm font-medium transition-all duration-200 sm:text-base",
                  isSelected
                    ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-100"
                    : "border-slate-200 bg-white/80 text-slate-800 hover:border-amber-300 hover:bg-amber-50/50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        onClick={handleNext}
        disabled={!selected || isPending}
        className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-base font-bold text-white shadow-lg shadow-amber-500/20 disabled:opacity-40"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          <>
            {isLastQuestion ? t("finish") : t("next")}
            <ChevronRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
