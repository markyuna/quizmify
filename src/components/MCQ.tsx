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
  LayoutDashboard,
  Plus,
} from "lucide-react";
import { Game, Question } from "@/generated/prisma/client";
import { useTranslations } from "next-intl";

import { findCuratedQuiz } from "@/lib/curatedQuizzes/registry";
import { normalizeTopic } from "@/lib/topicUtils";

import MCQCounter from "./MCQCounter";
import ExportPdfButton from "./ExportPdfButton";
import ShareResultButton from "./ShareResultButton";
import IconActionLink from "./IconActionLink";
import TrialOfferButton from "./TrialOfferButton";
import TrophyModal from "./trophy/TrophyModal";
import Globe3D from "./globe/Globe3D";
import PuzzleReveal from "./PuzzleReveal";
import ConversionModal from "./games/ConversionModal";
import { Button, buttonVariants } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { cn, formatTimeDelta } from "@/lib/utils";
import { getLevelProgress } from "@/lib/xp";
import { isGeographyTopic } from "@/lib/geography";
import { TIMEOUT_ANSWER_SENTINEL } from "@/lib/timedMode";
import { FREE_TRIAL_DAYS } from "@/lib/premium";
import type { TrophyReason } from "@/app/api/quiz/submit/route";

type QuestionWithOptions = Pick<
  Question,
  "id" | "question" | "answer" | "options" | "explanation" | "country" | "imageUrl"
>;

/**
 * A small, stable "wobble" per curated (image) question, for the polaroid-
 * style frame -- deterministic from the question's own id rather than
 * Math.random(), so server-rendered and hydrated markup always agree (a
 * random value picked at render time would mismatch between the two and
 * trip a hydration warning). Mirrors the same char-code hash idiom already
 * used by pickPhotoForDate in src/lib/games/photoOfDay.ts.
 */
function polaroidRotationDeg(questionId: string): number {
  let hash = 0;
  for (let i = 0; i < questionId.length; i++) {
    hash = (hash * 31 + questionId.charCodeAt(i)) % 1000;
  }
  return (hash % 7) - 3; // -3..3
}

type MCQProps = {
  game: Game & {
    questions: QuestionWithOptions[];
  };
  // True when this game has no owning account yet (played via the guestId
  // cookie, see /app/play/mcq/[gameId]/page.tsx). Guests play the full quiz
  // normally -- per-question feedback still works -- but the result screen
  // is replaced by a blocking ConversionModal instead of score/XP, and
  // POST /api/quiz/submit (which requires a session) is never called.
  // Registering claims the game via /api/guest/claim-quiz, which applies
  // the same score/XP after the fact.
  isGuest: boolean;
};

type CheckAnswerResponse = {
  correct: boolean;
  correctAnswer?: string;
};

type NextBatchResponse = {
  success: boolean;
  difficultyAdjusted: boolean;
  newDifficulty: "easy" | "medium" | "hard";
  questions: QuestionWithOptions[];
};

type AnswerRecord = {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  responseTimeMs: number | null;
};

type SubmitQuizResponse = {
  success: boolean;
  attemptId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  earnedXp: number;
  speedBonusXp: number;
  newXp: number;
  previousLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  hitFreeLimit: boolean;
  trialAvailable: boolean;
  paywallMessage: { key: string; values: Record<string, string | number> } | null;
  currentStreak: number;
  trophyReason: TrophyReason;
  curatedPracticeOnly: boolean;
};

const MCQ = ({ game, isGuest }: MCQProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("MCQ");
  const tTrial = useTranslations("Trial");
  const tRoot = useTranslations();

  // Curated quizzes (see src/lib/curatedQuizzes) always follow the LIVE UI
  // locale for title/question/explanation -- switching the language
  // selector mid-quiz re-translates immediately, current question included,
  // not just later ones. Deliberately NOT anchored to game.language/
  // creation time: that was tried to avoid a mid-switch mismatch, but
  // produced a worse result (chrome in one language, question content stuck
  // in another) than just keeping everything live and consistent with the
  // selector at all times.
  const curated = React.useMemo(
    () => findCuratedQuiz(game.categorySlug, normalizeTopic(game.topic)),
    [game.categorySlug, game.topic]
  );
  const tCurated = useTranslations(curated?.translationNamespace);
  // Question rows store the text resolved at creation time, not the
  // titleKey itself (see the curated branch in /api/game/route.ts) -- join
  // back to it via imageUrl, which is unique per curated question and never
  // changes. Curated quizzes are never shuffled (registry.ts), but this
  // doesn't depend on that -- it's a lookup by value, not by position.
  const curatedTitleKeyByImage = React.useMemo(() => {
    if (!curated) return null;
    return new Map(curated.questions.map((q) => [q.imageUrl, q.titleKey]));
  }, [curated]);
  const displayTopic = curated ? tCurated("title") : game.topic;

  const [questions, setQuestions] = React.useState<QuestionWithOptions[]>(game.questions);
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
  const [showTrophy, setShowTrophy] = React.useState(false);
  const [litCountries, setLitCountries] = React.useState<string[]>([]);
  const [revealedPuzzlePieces, setRevealedPuzzlePieces] = React.useState<Set<number>>(new Set());

  const timeLimitMs = game.isTimed && game.timePerQuestionSec ? game.timePerQuestionSec * 1000 : null;
  const [questionShownAt, setQuestionShownAt] = React.useState(() => new Date().getTime());
  const [remainingMs, setRemainingMs] = React.useState<number | null>(timeLimitMs);
  const [timedOut, setTimedOut] = React.useState(false);

  const currentQuestion = questions[questionIndex];
  // Live-translated question/explanation for a curated quiz, overriding
  // the creation-time-baked currentQuestion.question/explanation -- see the
  // comment on curatedTitleKeyByImage above. Falls back to the stored text
  // for a non-curated (AI-generated) question, which has no titleKey to
  // look up and isn't meant to retranslate live anyway.
  const curatedTitleKey = curatedTitleKeyByImage?.get(currentQuestion.imageUrl ?? "");
  const displayQuestionText = curatedTitleKey
    ? tCurated("questionTemplate", { title: tCurated(`titles.${curatedTitleKey}`) })
    : currentQuestion.question;
  const displayExplanation = curatedTitleKey ? tCurated(`explanations.${curatedTitleKey}`) : currentQuestion.explanation;
  // Total the quiz is *planned* to have vs. what's currently loaded --
  // for an adaptive-difficulty game those differ until the second batch
  // arrives (see fetchNextBatch below). For a non-adaptive game
  // plannedQuestionCount is null and they're the same thing.
  const totalQuestions = game.plannedQuestionCount ?? questions.length;
  const isLastLoadedQuestion = questionIndex === questions.length - 1;
  const isLastQuestion = questionIndex === totalQuestions - 1;
  const isGeography = React.useMemo(() => isGeographyTopic(game.topic), [game.topic]);

  const { mutate: checkAnswer, isPending: isCheckingAnswer } = useMutation({
    mutationFn: async ({
      questionId,
      userAnswer,
    }: {
      questionId: string;
      userAnswer: string;
      responseTimeMs: number | null;
    }) => {
      const response = await axios.post<CheckAnswerResponse>("/api/checkAnswer", { questionId, userAnswer });
      return response.data;
    },
    onSuccess: (data, variables) => {
      const isCorrect = data.correct;
      const correctAnswer =
        data.correctAnswer ??
        questions.find((q) => q.id === variables.questionId)?.answer ??
        "";

      setHasAnswered(true);
      setLastAnswerWasCorrect(isCorrect);
      setLastCorrectAnswer(correctAnswer);

      if (isCorrect) {
        setScore((prev) => prev + 1);

        const answeredQuestionIndex = questions.findIndex((q) => q.id === variables.questionId);
        const answeredQuestion = questions[answeredQuestionIndex];

        if (answeredQuestion?.country) {
          const country = answeredQuestion.country;
          setLitCountries((prev) => (prev.includes(country) ? prev : [...prev, country]));
        }

        if (game.puzzleImageUrl && answeredQuestionIndex !== -1) {
          setRevealedPuzzlePieces((prev) => {
            if (prev.has(answeredQuestionIndex)) return prev;
            const next = new Set(prev);
            next.add(answeredQuestionIndex);
            return next;
          });
        }
      }

      setAnswers((prev) => {
        const filtered = prev.filter((a) => a.questionId !== variables.questionId);
        return [
          ...filtered,
          {
            questionId: variables.questionId,
            selectedAnswer: variables.userAnswer,
            isCorrect,
            responseTimeMs: variables.responseTimeMs,
          },
        ];
      });
    },
    onError: () => {
      toast({ title: t("error"), description: t("unableToCheckAnswer"), variant: "destructive" });
    },
  });

  const { mutateAsync: fetchNextBatch, isPending: isLoadingNextBatch } = useMutation({
    mutationFn: async () => {
      const response = await axios.post<NextBatchResponse>(`/api/game/${game.id}/next-batch`);
      return response.data;
    },
    onSuccess: (data) => {
      setQuestions((prev) => [...prev, ...data.questions]);
    },
    onError: () => {
      toast({ title: t("error"), description: t("unableToLoadNextQuestions"), variant: "destructive" });
    },
  });

  const { mutate: submitQuiz, isPending: isSubmittingQuiz } = useMutation({
    mutationFn: async (payload: {
      gameId: string;
      timeSpent: number;
      answers: { questionId: string; selectedAnswer: string; responseTimeMs?: number }[];
    }) => {
      const response = await axios.post<SubmitQuizResponse>("/api/quiz/submit", payload);
      return response.data;
    },
    onSuccess: (data) => {
      setFinalResult(data);
      setQuizFinished(true);
      setShowLevelUpOverlay(data.didLevelUp);
      setShowTrophy(data.trophyReason !== null);
    },
    onError: () => {
      setFinalElapsedSeconds(null);
      toast({ title: t("error"), description: t("unableToSaveResult"), variant: "destructive" });
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
    const responseTimeMs = new Date().getTime() - questionShownAt;
    setSelectedAnswer(option);
    checkAnswer({ questionId: currentQuestion.id, userAnswer: option, responseTimeMs });
  };

  const handleTimeout = React.useCallback(() => {
    if (hasAnswered || isCheckingAnswer || isSubmittingQuiz || !currentQuestion) return;
    setTimedOut(true);
    checkAnswer({
      questionId: currentQuestion.id,
      userAnswer: TIMEOUT_ANSWER_SENTINEL,
      responseTimeMs: timeLimitMs,
    });
  }, [hasAnswered, isCheckingAnswer, isSubmittingQuiz, currentQuestion, checkAnswer, timeLimitMs]);

  // Timed-mode per-question countdown: ticks every 200ms while the current
  // question is unanswered, auto-submits a sentinel wrong answer via the
  // same /api/checkAnswer path once the limit is reached.
  React.useEffect(() => {
    if (!timeLimitMs || hasAnswered || quizFinished) return;

    const interval = setInterval(() => {
      const remaining = timeLimitMs - (new Date().getTime() - questionShownAt);

      if (remaining <= 0) {
        setRemainingMs(0);
        clearInterval(interval);
        handleTimeout();
      } else {
        setRemainingMs(remaining);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [timeLimitMs, hasAnswered, quizFinished, questionShownAt, handleTimeout]);

  const handleNext = async () => {
    if (!hasAnswered || isSubmittingQuiz || isLoadingNextBatch) return;

    // Reached the end of the currently-loaded (first) batch, but the quiz
    // isn't actually done -- fetch the adaptive-difficulty second batch
    // before advancing. On failure, stay put; the mutation already
    // toasted, and the button is just clickable again to retry.
    if (isLastLoadedQuestion && !isLastQuestion) {
      try {
        await fetchNextBatch();
      } catch {
        return;
      }
    }

    if (!isLastQuestion) {
      setQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setLastCorrectAnswer(null);
      setLastAnswerWasCorrect(null);
      setTimedOut(false);
      setQuestionShownAt(new Date().getTime());
      setRemainingMs(timeLimitMs);
      return;
    }

    const frozenElapsedSeconds = differenceInSeconds(new Date(), timeStartedAt);
    setFinalElapsedSeconds(frozenElapsedSeconds);

    // Guests have no session, so /api/quiz/submit (which requires one) is
    // never called -- there's no score/XP to save yet. The result stays
    // behind ConversionModal until /api/guest/claim-quiz applies it on
    // registration.
    if (isGuest) {
      setQuizFinished(true);
      return;
    }

    submitQuiz({
      gameId: game.id,
      timeSpent: frozenElapsedSeconds,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        selectedAnswer: a.selectedAnswer,
        responseTimeMs: a.responseTimeMs ?? undefined,
      })),
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
          <p className="text-xl font-bold text-slate-900 dark:text-white">{t("noQuestionsFound")}</p>
          <Link href="/quiz" className={cn(buttonVariants(), "mt-4")}>{t("backToQuiz")}</Link>
        </div>
      </div>
    );
  }

  if (quizFinished && isGuest) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <ConversionModal open onOpenChange={() => {}} />
      </div>
    );
  }

  if (quizFinished) {
    const totalQ = finalResult?.totalQuestions ?? questions.length;
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
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.35em] text-violet-500 dark:text-violet-300">{t("levelUp")}</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-900 dark:text-white">{t("level")} {finalResult.newLevel}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {t("fromLevelToLevel", { from: finalResult.previousLevel, to: finalResult.newLevel })}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTrophy && finalResult?.trophyReason && (
            <TrophyModal
              reason={finalResult.trophyReason}
              streakCount={finalResult.currentStreak}
              onClose={() => setShowTrophy(false)}
            />
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">{t("quizCompleted")}</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">{displayTopic}</h1>
            </div>
            <span className="text-4xl">{scoreEmoji}</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/5">
              <p className={cn("text-3xl font-black", scoreColor)}>{finalScore}%</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("score")}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/5">
              <p className="text-3xl font-black text-slate-900 dark:text-white">{correctA}/{totalQ}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("correct")}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/5">
              <p className="text-3xl font-black text-slate-900 dark:text-white">{formatTimeDelta(displayedElapsedSeconds)}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("time")}</p>
            </div>
          </div>
        </motion.div>

        {game.puzzleImageUrl && revealedPuzzlePieces.size === totalQ && (
          <PuzzleReveal
            imageUrl={game.puzzleImageUrl}
            totalPieces={totalQ}
            revealedIndices={revealedPuzzlePieces}
            title={t("puzzleCompleteTitle")}
            progressLabel={t("puzzleCompleteLabel")}
          />
        )}

        {finalResult?.curatedPracticeOnly && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.75rem] border border-slate-200/80 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            {t("curatedPracticeOnly")}
          </motion.div>
        )}

        {finalResult && levelProgress && !finalResult.hitFreeLimit && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[1.75rem] border border-violet-200/60 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/8 to-cyan-500/10 p-5 backdrop-blur-xl dark:border-violet-500/20 dark:from-violet-500/15 dark:via-fuchsia-500/10 dark:to-cyan-500/15"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">{t("xpEarned")}</p>
                <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">+{finalResult.earnedXp} XP</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {t("level")} {finalResult.newLevel} · {t("xpTotal", { xp: finalResult.newXp })}
                </p>
                {finalResult.speedBonusXp > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                    <Zap className="h-3.5 w-3.5" />+{finalResult.speedBonusXp} XP {t("speedBonus")}
                  </p>
                )}
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
                <p className="text-xs text-slate-400">{t("level")}</p>
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
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-300">{t("freeLimitReached")}</p>
                  <p className="mt-1 text-lg font-black text-white">{t("reachedLevel2")}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {finalResult.paywallMessage ? tRoot(finalResult.paywallMessage.key, finalResult.paywallMessage.values) : t("upgradePrompt")}
                  </p>
                </div>
              </div>

              {finalResult.trialAvailable ? (
                <>
                  <TrialOfferButton
                    days={FREE_TRIAL_DAYS}
                    className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 text-sm font-bold text-white hover:opacity-90"
                  />
                  <Link
                    href="/upgrade"
                    className="mt-2 block text-center text-xs font-medium text-white/50 hover:text-white/80"
                  >
                    {tTrial("orUpgrade")}
                  </Link>
                </>
              ) : (
                <Link
                  href="/upgrade"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
                >
                  <Zap className="h-4 w-4" />
                  {t("upgradeToPro")}
                </Link>
              )}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={handlePlayAgain}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/20 hover:opacity-95"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("playAgain")}
          </Button>

          {/* Secondary actions: icon-only row, tooltip on hover (desktop),
              aria-label carries the accessible name since there's no visible
              text. Scrolls horizontally on narrow screens instead of
              wrapping into a cramped grid. TooltipProvider lives in the
              root layout, not here. */}
          <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:justify-center">
            <IconActionLink
              href={`/statistics/${game.id}`}
              label={t("statistics")}
              icon={<BarChart3 className="h-5 w-5" />}
            />

            <ExportPdfButton gameId={game.id} compact />

            <ShareResultButton
              compact
              topic={game.topic}
              score={finalScore}
              correctAnswers={correctA}
              totalQuestions={totalQ}
              currentStreak={finalResult?.currentStreak ?? 0}
              puzzleImageUrl={
                game.puzzleImageUrl && revealedPuzzlePieces.size === totalQ ? game.puzzleImageUrl : null
              }
            />

            {finalScore < 100 && (
              <IconActionLink
                href="/quiz/mistakes"
                label={t("practiceMistakes")}
                icon={<AlertCircle className="h-5 w-5" />}
              />
            )}

            <IconActionLink href="/quiz" label={t("newQuiz")} icon={<Plus className="h-5 w-5" />} />

            <IconActionLink
              href="/dashboard"
              label={t("backToDashboard")}
              icon={<LayoutDashboard className="h-5 w-5" />}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // Wider only for image-based (curated) questions, and only from sm: up --
  // below that the viewport itself is already narrower than max-w-2xl, so
  // this never affects the mobile stacked layout. AI-generated (no
  // imageUrl) quizzes keep max-w-2xl at every breakpoint, unchanged. Shared
  // by the card, the desktop "next question" button row, and the home link
  // row below it so all three stay aligned under the wider card.
  const cardMaxWidthClass = currentQuestion.imageUrl ? "max-w-2xl sm:max-w-5xl" : "max-w-2xl";

  return (
    <div className="flex w-full flex-col pb-24 sm:pb-8">
      <div className={cn("mx-auto w-full px-4 pt-2", cardMaxWidthClass)}>
        <div className="mb-4 flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{displayTopic}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {t("questionAbbrev")}{questionIndex + 1} <span className="font-normal text-slate-400">/ {totalQuestions}</span>
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

        {timeLimitMs !== null && remainingMs !== null && !hasAnswered && (
          <div className="mb-4 rounded-[1.5rem] border border-amber-200/80 bg-amber-50/60 p-3 shadow-sm backdrop-blur-xl dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300">
              <span className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {t("timeLeft")}
              </span>
              <span className="tabular-nums">{Math.ceil(remainingMs / 1000)}s</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-amber-200/60 dark:bg-amber-500/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-[width] duration-200 ease-linear"
                style={{ width: `${Math.max(0, Math.min(100, (remainingMs / timeLimitMs) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {timedOut && hasAnswered && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            ⏱️ {t("timeUp")}
          </div>
        )}

        {isGeography && (
          <div className="mb-4 flex flex-col items-center gap-2 rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <Globe3D litCountries={litCountries} size={200} />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("countriesDiscovered", { count: litCountries.length })}
            </p>
          </div>
        )}

        {game.puzzleImageUrl && (
          <PuzzleReveal
            imageUrl={game.puzzleImageUrl}
            totalPieces={totalQuestions}
            revealedIndices={revealedPuzzlePieces}
            title={t("puzzleTitle")}
            progressLabel={t("puzzlePiecesRevealed", { revealed: revealedPuzzlePieces.size, total: totalQuestions })}
          />
        )}

        <div className="mb-3">
          <MCQCounter currentQuestionIndex={questionIndex} questionsLength={totalQuestions} />
        </div>

        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          {(() => {
            const renderedOptions = currentQuestion.options.map((option, index) => {
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
            });

            const answeredFeedback = hasAnswered && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 pt-1"
                >
                  {lastAnswerWasCorrect === false && lastCorrectAnswer && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                      {t("correctAnswerLabel")} <span className="font-semibold">{lastCorrectAnswer}</span>
                    </div>
                  )}
                  {lastAnswerWasCorrect === true && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                      ✓ {t("correctKeepGoing")}
                    </div>
                  )}
                  {displayExplanation && (
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200">
                      <span className="font-semibold">{t("explanationLabel")}</span> {displayExplanation}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            );

            const unansweredHint = !hasAnswered && (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-50/60 px-4 py-3 text-sm text-slate-500 dark:border-white/5 dark:bg-white/3 dark:text-slate-400">
                {isCheckingAnswer ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("checking")}
                  </>
                ) : (
                  `👆 ${t("tapAnAnswer")}`
                )}
              </div>
            );

            if (currentQuestion.imageUrl) {
              // Curated (image-based) questions only, e.g. "Qui est le
              // peintre?" -- the 10 curated artworks span very different
              // aspect ratios (portrait to landscape). Polaroid/frame style
              // (culturequizz.com reference): a plain <img>, not next/image
              // with `fill`, so the browser sizes it to its own natural
              // aspect ratio -- capped by max-h/max-w, never forced into a
              // fixed box -- instead of letterboxing inside one shared
              // shape. The correct/explanation block stays a separate
              // full-width section below the image+options row (unchanged
              // from before), so it never affects the frame's size either.
              return (
                <div className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1.15fr_1fr] sm:gap-6">
                    {/* items-start is the actual fix for the "empty space
                        below the frame" bug: without it, this flex
                        container's default align-items:stretch stretches
                        the polaroid frame to match the grid row's height
                        (driven by the taller text column) regardless of the
                        image's own size -- no CSS on the frame or image
                        itself could ever fix that, the flex parent was
                        overriding it. */}
                    <div className="flex items-start justify-center sm:justify-start">
                      <div
                        className="inline-flex rounded-md border-[10px] border-white bg-white shadow-xl"
                        style={{ transform: `rotate(${polaroidRotationDeg(currentQuestion.id)}deg)` }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- natural aspect ratio, not a fixed box; see comment above */}
                        <img
                          src={currentQuestion.imageUrl}
                          alt=""
                          className="block max-h-64 max-w-full rounded-sm object-contain sm:max-h-80 sm:max-w-[420px]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-3">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">
                          {t("question")} {questionIndex + 1}
                        </p>
                        <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white sm:text-xl">
                          {displayQuestionText}
                        </h2>
                      </div>
                      <div className="space-y-2">
                        {renderedOptions}
                        {unansweredHint}
                      </div>
                    </div>
                  </div>

                  {answeredFeedback && <div className="mt-4">{answeredFeedback}</div>}
                </div>
              );
            }

            return (
              <>
                <div className="p-5 sm:p-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">
                    {t("question")} {questionIndex + 1}
                  </p>
                  <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white sm:text-xl">
                    {displayQuestionText}
                  </h2>
                </div>
                <div className="space-y-2.5 px-5 pb-5 sm:px-6 sm:pb-6">
                  {renderedOptions}
                  {answeredFeedback}
                  {unansweredHint}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:hidden">
        <Button
          onClick={handleNext}
          disabled={!hasAnswered || isSubmittingQuiz || isLoadingNextBatch}
          className="h-13 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 text-base font-bold text-white shadow-lg shadow-violet-500/20 disabled:opacity-40"
        >
          {isSubmittingQuiz ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("saving")}</>
          ) : isLoadingNextBatch ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("loadingNextQuestions")}</>
          ) : (
            <>{isLastQuestion ? t("finishQuiz") : t("nextQuestion")}<ChevronRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </div>

      {/* Desktop: home link + inline next button share one row (Home left,
          Next right) -- the button's wrapper is always mounted (space
          reserved via `invisible`) so its h-12 height doesn't pop in and
          push Home out of line the instant the user answers. */}
      <div
        className={cn(
          "mx-auto hidden w-full items-center justify-between px-4 sm:flex",
          currentQuestion.imageUrl ? "mt-2" : "mt-4",
          cardMaxWidthClass
        )}
      >
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost" }), "text-slate-500 hover:text-slate-900 dark:hover:text-white")}
        >
          ← {t("home")}
        </Link>

        <div className={cn(!hasAnswered && "invisible")}>
          <Button
            onClick={handleNext}
            disabled={!hasAnswered || isSubmittingQuiz || isLoadingNextBatch}
            className="h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-8 text-white shadow-lg shadow-violet-500/20 hover:opacity-95"
          >
            {isSubmittingQuiz ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("saving")}</>
            ) : isLoadingNextBatch ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("loadingNextQuestions")}</>
            ) : (
              <>{isLastQuestion ? t("finishQuiz") : t("nextQuestion")}<ChevronRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MCQ;
