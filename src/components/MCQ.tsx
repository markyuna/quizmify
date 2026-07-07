"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { differenceInSeconds } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Timer,
  XCircle,
  BarChart3,
  RotateCcw,
  AlertCircle,
  Trophy,
  Zap,
  Lock,
} from "lucide-react";
import { Game, Question } from "@/generated/prisma/client";

import MCQCounter from "./MCQCounter";
import { Button, buttonVariants } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { cn, formatTimeDelta } from "@/lib/utils";
import { getLevelProgress } from "@/lib/xp";

type QuestionWithOptions = Pick<
  Question,
  "id" | "question" | "answer" | "options" | "explanation"
>;

type MCQProps = {
  game: Game & {
    questions: QuestionWithOptions[];
  };
};

type CheckAnswerResponse = {
  correct: boolean;
  correctAnswer?: string;
};

type AnswerRecord = {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
};

type SubmitQuizResponse = {
  success: boolean;
  attemptId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  earnedXp: number;
  newXp: number;
  previousLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  hitFreeLimit: boolean;
};

const MCQ = ({ game }: MCQProps) => {
  const router = useRouter();
  const { toast } = useToast();

  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [now, setNow] = React.useState(new Date());
  const [timeStartedAt] = React.useState<Date>(new Date(game.timeStarted));
  const [finalElapsedSeconds, setFinalElapsedSeconds] = React.useState<number | null>(null);
  const [answers, setAnswers] = React.useState<AnswerRecord[]>([]);
  const [lastCorrectAnswer, setLastCorrectAnswer] = React.useState<string | null>(null);
  const [lastAnswerWasCorrect, setLastAnswerWasCorrect] = React.useState<boolean | null>(null);
  const [quizFinished, setQuizFinished] = React.useState(false);
  const [finalResult, setFinalResult] = React.useState<SubmitQuizResponse | null>(null);
  const [showLevelUpOverlay, setShowLevelUpOverlay] = React.useState(false);

  const currentQuestion = game.questions[questionIndex];
  const isLastQuestion = questionIndex === game.questions.length - 1;
  const totalQuestions = game.questions.length;

  const { mutate: checkAnswer, isPending: isCheckingAnswer } = useMutation({
    mutationFn: async ({ questionId, userAnswer }: { questionId: string; userAnswer: string }) => {
      const response = await axios.post<CheckAnswerResponse>("/api/checkAnswer", { questionId, userAnswer });
      return response.data;
    },
    onSuccess: (data, variables) => {
      const isCorrect = data.correct;
      const correctAnswer =
        data.correctAnswer ??
        game.questions.find((q) => q.id === variables.questionId)?.answer ??
        "";

      setHasAnswered(true);
      setLastAnswerWasCorrect(isCorrect);
      setLastCorrectAnswer(correctAnswer);

      if (isCorrect) {
        setScore((prev) => prev + 1);
      }

      setAnswers((prev) => {
        const filtered = prev.filter((a) => a.questionId !== variables.questionId);
        return [...filtered, { questionId: variables.questionId, selectedAnswer: variables.userAnswer, isCorrect }];
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Unable to check your answer.", variant: "destructive" });
    },
  });

  const { mutate: submitQuiz, isPending: isSubmittingQuiz } = useMutation({
    mutationFn: async (payload: { gameId: string; timeSpent: number; answers: { questionId: string; selectedAnswer: string }[] }) => {
      const response = await axios.post<SubmitQuizResponse>("/api/quiz/submit", payload);
      return response.data;
    },
    onSuccess: (data) => {
      setFinalResult(data);
      setQuizFinished(true);
      setShowLevelUpOverlay(data.didLevelUp);
    },
    onError: () => {
      setFinalElapsedSeconds(null);
      toast({ title: "Error", description: "Unable to save the final result.", variant: "destructive" });
    },
  });

  React.useEffect(() => {
    if (quizFinished || isSubmittingQuiz) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [quizFinished, isSubmittingQuiz]);

  React.useEffect(() => {
    if (!showLevelUpOverlay) return;
    const timeout = window.setTimeout(() => setShowLevelUpOverlay(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [showLevelUpOverlay]);

  const handleSelect = (option: string) => {
    if (hasAnswered || isCheckingAnswer || isSubmittingQuiz) return;
    setSelectedAnswer(option);
    checkAnswer({ questionId: currentQuestion.id, userAnswer: option });
  };

  const handleNext = () => {
    if (!hasAnswered || isSubmittingQuiz) return;

    if (!isLastQuestion) {
      setQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setLastCorrectAnswer(null);
      setLastAnswerWasCorrect(null);
      return;
    }

    const frozenElapsedSeconds = differenceInSeconds(new Date(), timeStartedAt);
    setFinalElapsedSeconds(frozenElapsedSeconds);

    submitQuiz({
      gameId: game.id,
      timeSpent: frozenElapsedSeconds,
      answers: answers.map((a) => ({ questionId: a.questionId, selectedAnswer: a.selectedAnswer })),
    });
  };

  const handlePlayAgain = () => {
    router.push(`/quiz?topic=${encodeURIComponent(game.topic)}`);
  };

  const liveElapsedSeconds = differenceInSeconds(now, timeStartedAt);
  const displayedElapsedSeconds = finalElapsedSeconds ?? liveElapsedSeconds;
  const levelProgress = finalResult ? getLevelProgress(finalResult.newXp) : null;

  const getOptionStyle = (option: string) => {
    const isCorrect = option === currentQuestion.answer;
    const isSelected = option === selectedAnswer;

    if (!hasAnswered) {
      return "border-slate-200 bg-white/80 text-slate-800 hover:border-violet-300 hover:bg-violet-50/50 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10";
    }
    if (isCorrect) {
      return "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-500/15 dark:text-emerald-100";
    }
    if (isSelected && !isCorrect) {
      return "border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-500/60 dark:bg-rose-500/15 dark:text-rose-100";
    }
    return "border-slate-200/60 bg-white/40 text-slate-400 opacity-60 dark:border-white/5 dark:bg-white/3 dark:text-slate-500";
  };

  if (!currentQuestion && !quizFinished) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-xl font-bold text-slate-900 dark:text-white">No questions found</p>
          <Link href="/quiz" className={cn(buttonVariants(), "mt-4")}>Back to Quiz</Link>
        </div>
      </div>
    );
  }

  if (quizFinished) {
    const totalQ = finalResult?.totalQuestions ?? game.questions.length;
    const correctA = finalResult?.correctAnswers ?? score;
    const finalScore = finalResult?.score ?? Math.round((score / totalQ) * 100);
    const scoreColor = finalScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : finalScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
    const scoreEmoji = finalScore >= 80 ? "🏆" : finalScore >= 50 ? "👍" : "💪";

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-8 pt-2">
        <AnimatePresence>
          {showLevelUpOverlay && finalResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                className="mx-4 w-full max-w-sm rounded-[2rem] border border-violet-300/20 bg-white/90 p-8 text-center shadow-[0_30px_80px_-20px_rgba(139,92,246,0.5)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 text-3xl shadow-xl">
                  🎉
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.35em] text-violet-500 dark:text-violet-300">Level Up!</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-900 dark:text-white">Level {finalResult.newLevel}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  From Level {finalResult.previousLevel} → Level {finalResult.newLevel}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">Quiz completed</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">{game.topic}</h1>
            </div>
            <span className="text-4xl">{scoreEmoji}</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/5">
              <p className={cn("text-3xl font-black", scoreColor)}>{finalScore}%</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Score</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/5">
              <p className="text-3xl font-black text-slate-900 dark:text-white">{correctA}/{totalQ}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Correct</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/5">
              <p className="text-3xl font-black text-slate-900 dark:text-white">{formatTimeDelta(displayedElapsedSeconds)}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Time</p>
            </div>
          </div>
        </motion.div>

        {finalResult && levelProgress && !finalResult.hitFreeLimit && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[1.75rem] border border-violet-200/60 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/8 to-cyan-500/10 p-5 backdrop-blur-xl dark:border-violet-500/20 dark:from-violet-500/15 dark:via-fuchsia-500/10 dark:to-cyan-500/15"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">XP Earned</p>
                <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">+{finalResult.earnedXp} XP</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Level {finalResult.newLevel} · {finalResult.newXp} XP total
                </p>
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                    <span>{levelProgress.xpIntoCurrentLevel}/{levelProgress.xpPerLevel} XP</span>
                    <span>{Math.round(levelProgress.progressPercent)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/40 dark:bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${levelProgress.progressPercent}%` }}
                      transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500"
                    />
                  </div>
                </div>
              </div>
              <div className="shrink-0 rounded-2xl bg-white/60 px-4 py-3 text-center shadow-sm dark:bg-white/10">
                <p className="text-xs text-slate-400">Level</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{finalResult.newLevel}</p>
              </div>
            </div>
          </motion.div>
        )}

        {finalResult?.hitFreeLimit && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 p-px shadow-2xl shadow-violet-500/20"
          >
            <div className="rounded-[1.7rem] bg-slate-900 p-5 dark:bg-slate-950">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-300">Free limit reached</p>
                  <p className="mt-1 text-lg font-black text-white">You've reached Level 2</p>
                  <p className="mt-1 text-sm text-white/60">
                    Upgrade once to unlock unlimited level progression and keep earning XP.
                  </p>
                </div>
              </div>
              <Link
                href="/upgrade"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                <Zap className="h-4 w-4" />
                Upgrade to Pro — $5.99 one-time
              </Link>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap"
        >
          {finalResult?.hitFreeLimit ? (
            <>
              <Link
                href={`/statistics/${game.id}`}
                className={cn(buttonVariants({ variant: "secondary" }), "h-12 rounded-2xl")}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Statistics
              </Link>
              <Link
                href="/upgrade"
                className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-2xl col-span-2 sm:col-span-1")}
              >
                <Lock className="mr-2 h-4 w-4" />
                New Quiz (Upgrade)
              </Link>
            </>
          ) : (
            <>
              <Button
                onClick={handlePlayAgain}
                className="h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/20 hover:opacity-95"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Play Again
              </Button>

              <Link
                href={`/statistics/${game.id}`}
                className={cn(buttonVariants({ variant: "secondary" }), "h-12 rounded-2xl")}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Statistics
              </Link>

              {finalScore < 100 && (
                <Link
                  href="/quiz/mistakes"
                  className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-2xl col-span-2 sm:col-span-1")}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Practice Mistakes
                </Link>
              )}

              <Link
                href="/quiz"
                className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-2xl")}
              >
                New Quiz
              </Link>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col pb-24 sm:pb-8">
      <div className="mx-auto w-full max-w-2xl px-4 pt-2">
        <div className="mb-4 flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{game.topic}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Q{questionIndex + 1} <span className="font-normal text-slate-400">/ {totalQuestions}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">{score}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 dark:border-cyan-500/20 dark:bg-cyan-500/10">
              <Timer className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
              <span className="text-sm font-bold text-cyan-700 dark:text-cyan-200 tabular-nums">
                {formatTimeDelta(displayedElapsedSeconds)}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <MCQCounter currentQuestionIndex={questionIndex} questionsLength={totalQuestions} />
        </div>

        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div className="p-5 sm:p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">
              Question {questionIndex + 1}
            </p>
            <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white sm:text-xl">
              {currentQuestion.question}
            </h2>
          </div>

          <div className="space-y-2.5 px-5 pb-5 sm:px-6 sm:pb-6">
            {currentQuestion.options.map((option, index) => {
              const isCorrect = option === currentQuestion.answer;
              const isSelected = option === selectedAnswer;

              return (
                <button
                  key={`${option}-${index}`}
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={hasAnswered || isCheckingAnswer || isSubmittingQuiz}
                  className={cn(
                    "group flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-medium transition-all duration-200 sm:text-base",
                    "disabled:cursor-not-allowed",
                    getOptionStyle(option)
                  )}
                >
                  <span className="min-w-0 break-words">{option}</span>

                  {hasAnswered && isCorrect && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  )}
                  {hasAnswered && isSelected && !isCorrect && (
                    <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                  )}
                </button>
              );
            })}

            {hasAnswered && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 pt-1"
                >
                  {lastAnswerWasCorrect === false && lastCorrectAnswer && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                      Correct answer: <span className="font-semibold">{lastCorrectAnswer}</span>
                    </div>
                  )}
                  {lastAnswerWasCorrect === true && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                      ✓ Correct — keep going!
                    </div>
                  )}
                  {currentQuestion.explanation && (
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200">
                      <span className="font-semibold">Explanation:</span> {currentQuestion.explanation}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {!hasAnswered && (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-50/60 px-4 py-3 text-sm text-slate-500 dark:border-white/5 dark:bg-white/3 dark:text-slate-400">
                {isCheckingAnswer ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "👆 Tap an answer to continue"
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:hidden">
        <Button
          onClick={handleNext}
          disabled={!hasAnswered || isSubmittingQuiz}
          className="h-13 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 text-base font-bold text-white shadow-lg shadow-violet-500/20 disabled:opacity-40"
        >
          {isSubmittingQuiz ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
          ) : (
            <>{isLastQuestion ? "Finish Quiz 🎉" : "Next Question"}<ChevronRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </div>

      {/* Desktop: inline next button */}
      {hasAnswered && (
        <div className="mx-auto mt-4 hidden w-full max-w-2xl px-4 sm:flex sm:justify-end">
          <Button
            onClick={handleNext}
            disabled={isSubmittingQuiz}
            className="h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-8 text-white shadow-lg shadow-violet-500/20 hover:opacity-95"
          >
            {isSubmittingQuiz ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <>{isLastQuestion ? "Finish Quiz 🎉" : "Next Question"}<ChevronRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      )}

      <div className="mx-auto mt-4 hidden w-full max-w-2xl px-4 sm:flex sm:justify-start">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost" }), "text-slate-500 hover:text-slate-900 dark:hover:text-white")}
        >
          ← Home
        </Link>
      </div>
    </div>
  );
};

export default MCQ;
