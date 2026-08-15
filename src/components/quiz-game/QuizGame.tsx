"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { differenceInSeconds } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

import type { Game, Question } from "@/generated/prisma/client";
import { useQuizGame, type QuizGameAnswerRecord } from "@/hooks/useQuizGame";
import { confettiCorrectAnswer } from "@/lib/confettiBurst";
import { playQuizSound } from "@/lib/quizSounds";
import { KAHOOT_DEFAULT_TIME_PER_QUESTION_SEC } from "@/lib/kahootConfig";
import { TIMEOUT_ANSWER_SENTINEL } from "@/lib/timedMode";
import { buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import QuestionCard from "./QuestionCard";
import ScoreBoard from "./ScoreBoard";
import TimerBar from "./TimerBar";
import ResultScreen from "./ResultScreen";

type QuestionWithOptions = Pick<
  Question,
  "id" | "question" | "answer" | "options" | "explanation" | "country" | "imageUrl"
>;

type QuizGameProps = {
  game: Game & { questions: QuestionWithOptions[] };
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

type SubmitQuizResponse = {
  success: boolean;
  attemptId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  earnedXp: number;
  newXp: number;
  newLevel: number;
  hitFreeLimit: boolean;
};

export default function QuizGame({ game }: QuizGameProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("MCQ");

  const [questions, setQuestions] = React.useState<QuestionWithOptions[]>(game.questions);
  const [submitResult, setSubmitResult] = React.useState<SubmitQuizResponse | null>(null);

  const timePerQuestionSec = game.timePerQuestionSec ?? KAHOOT_DEFAULT_TIME_PER_QUESTION_SEC;
  const plannedTotalQuestions = game.plannedQuestionCount ?? game.questions.length;

  const { mutate: checkAnswer } = useMutation({
    mutationFn: async (payload: { questionId: string; userAnswer: string; responseTimeMs: number }) => {
      const response = await axios.post<CheckAnswerResponse>("/api/checkAnswer", {
        questionId: payload.questionId,
        userAnswer: payload.userAnswer,
      });
      return response.data;
    },
    onError: (error) => {
      // Fire-and-forget persistence for mistake-tracking -- a failure here
      // shouldn't interrupt the fast-paced game loop with a per-question
      // toast. The authoritative score still comes from /api/quiz/submit.
      console.error("checkAnswer persistence failed:", error);
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
    onSuccess: (data) => setSubmitResult(data),
    onError: (error) => {
      console.error("submitQuiz failed:", error);
    },
  });

  const { mutateAsync: fetchNextBatch } = useMutation({
    mutationFn: async () => {
      const response = await axios.post<NextBatchResponse>(`/api/game/${game.id}/next-batch`);
      return response.data;
    },
  });

  // Only relevant for adaptive-difficulty games (plannedTotalQuestions >
  // questions.length): fetches and appends the second batch. Resolves
  // false on failure so useQuizGame ends the quiz gracefully at whatever
  // was already loaded instead of advancing into a missing question.
  const handleNeedMoreQuestions = React.useCallback(async () => {
    try {
      const data = await fetchNextBatch();
      setQuestions((prev) => [...prev, ...data.questions]);
      return data.questions.length > 0;
    } catch (error) {
      console.error("fetchNextBatch failed:", error);
      toast({ title: t("error"), description: t("unableToLoadNextQuestions"), variant: "destructive" });
      return false;
    }
  }, [fetchNextBatch, toast, t]);

  const handleAnswer = React.useCallback(
    (record: QuizGameAnswerRecord) => {
      checkAnswer({
        questionId: record.questionId,
        userAnswer: record.selectedAnswer ?? TIMEOUT_ANSWER_SENTINEL,
        responseTimeMs: record.responseTimeMs,
      });

      if (record.isCorrect) {
        confettiCorrectAnswer();
        playQuizSound("correct");
      } else {
        playQuizSound("incorrect");
      }
    },
    [checkAnswer]
  );

  const handleFinish = React.useCallback(
    (summary: { answers: QuizGameAnswerRecord[] }) => {
      const timeSpent = differenceInSeconds(new Date(), new Date(game.timeStarted));
      submitQuiz({
        gameId: game.id,
        timeSpent,
        answers: summary.answers.map((a) => ({
          questionId: a.questionId,
          selectedAnswer: a.selectedAnswer ?? TIMEOUT_ANSWER_SENTINEL,
          responseTimeMs: a.responseTimeMs,
        })),
      });
    },
    [game.id, game.timeStarted, submitQuiz]
  );

  const {
    currentQuestion,
    questionIndex,
    totalQuestions,
    score,
    streak,
    bestStreak,
    timeLimitMs,
    remainingMs,
    selectedOption,
    hasAnswered,
    isFinished,
    answers,
    selectOption,
  } = useQuizGame({
    questions,
    plannedTotalQuestions,
    timePerQuestionSec,
    onAnswer: handleAnswer,
    onFinish: handleFinish,
    onNeedMoreQuestions: handleNeedMoreQuestions,
  });

  const handlePlayAgain = () => {
    router.push(`/quiz?topic=${encodeURIComponent(game.topic)}`);
  };

  if (!currentQuestion && !isFinished) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-xl font-bold text-slate-900 dark:text-white">{t("noQuestionsFound")}</p>
          <Link href="/quiz" className={cn(buttonVariants(), "mt-4")}>
            {t("backToQuiz")}
          </Link>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <ResultScreen
        score={score}
        bestStreak={bestStreak}
        answers={answers}
        questions={questions}
        onPlayAgain={handlePlayAgain}
        isSaving={isSubmittingQuiz}
        submitOutcome={
          submitResult
            ? {
                earnedXp: submitResult.earnedXp,
                newLevel: submitResult.newLevel,
                hitFreeLimit: submitResult.hitFreeLimit,
              }
            : null
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-2">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
          {game.topic} <span className="font-normal text-slate-400">· {questionIndex + 1}/{totalQuestions}</span>
        </p>
        <ScoreBoard score={score} streak={streak} />
      </div>

      <div className="mb-4">
        <TimerBar remainingMs={remainingMs} timeLimitMs={timeLimitMs} />
      </div>

      <AnimatePresence mode="wait">
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          selectedOption={selectedOption}
          hasAnswered={hasAnswered}
          disabled={hasAnswered}
          onSelect={selectOption}
        />
      </AnimatePresence>
    </div>
  );
}
