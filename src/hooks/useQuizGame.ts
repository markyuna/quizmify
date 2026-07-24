"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  KAHOOT_BASE_POINTS,
  KAHOOT_DEFAULT_TIME_PER_QUESTION_SEC,
  KAHOOT_MAX_TIME_BONUS,
  KAHOOT_REVEAL_MS,
  KAHOOT_STREAK_MULTIPLIER_CAP,
  KAHOOT_STREAK_MULTIPLIER_STEP,
} from "@/lib/kahootConfig";

export type QuizGameQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation?: string | null;
  imageUrl?: string | null;
};

export type QuizGameAnswerRecord = {
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  responseTimeMs: number;
  pointsAwarded: number;
};

export type QuizGameSummary = {
  score: number;
  answers: QuizGameAnswerRecord[];
  correctCount: number;
  totalQuestions: number;
};

type UseQuizGameArgs = {
  questions: QuizGameQuestion[];
  /** Full quiz length when it's larger than what's currently loaded (e.g.
   * an adaptive-difficulty game whose second batch hasn't been fetched
   * yet). Defaults to `questions.length` for quizzes generated upfront in
   * one batch. */
  plannedTotalQuestions?: number;
  timePerQuestionSec?: number;
  /** Fired synchronously once a question is answered (or times out) -- the
   * caller uses this to persist the answer server-side; it doesn't affect
   * local scoring, which is already final by the time this fires. */
  onAnswer?: (record: QuizGameAnswerRecord) => void;
  onFinish?: (summary: QuizGameSummary) => void;
  /** Disables the auto-advance timer -- useful while a persistence call for
   * the just-answered question is still in flight. */
  holdAdvance?: boolean;
  /** Called once, as soon as the reveal for the last *loaded* (but not yet
   * last *planned*) question starts -- well before the auto-advance timer
   * fires, so the fetch usually finishes invisibly during the reveal. The
   * caller is expected to append the new questions to the `questions` array
   * it passes in, then resolve `true`; resolving `false` (fetch failed or
   * came back empty) ends the quiz gracefully at whatever was loaded
   * instead of advancing into a missing question. */
  onNeedMoreQuestions?: () => Promise<boolean>;
};

function computePoints(remainingMs: number, timeLimitMs: number, streakBeforeAnswer: number) {
  const fraction = timeLimitMs > 0 ? Math.max(0, Math.min(1, remainingMs / timeLimitMs)) : 0;
  const timeBonus = Math.round(KAHOOT_MAX_TIME_BONUS * fraction);
  const multiplier = 1 + Math.min(streakBeforeAnswer, KAHOOT_STREAK_MULTIPLIER_CAP) * KAHOOT_STREAK_MULTIPLIER_STEP;
  return Math.round((KAHOOT_BASE_POINTS + timeBonus) * multiplier);
}

export function useQuizGame({
  questions,
  plannedTotalQuestions,
  timePerQuestionSec = KAHOOT_DEFAULT_TIME_PER_QUESTION_SEC,
  onAnswer,
  onFinish,
  holdAdvance = false,
  onNeedMoreQuestions,
}: UseQuizGameArgs) {
  const timeLimitMs = timePerQuestionSec * 1000;

  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastIsCorrect, setLastIsCorrect] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [remainingMs, setRemainingMs] = useState(timeLimitMs);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<QuizGameAnswerRecord[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [questionShownAt, setQuestionShownAt] = useState(() => Date.now());
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingFetchRef = useRef<Promise<boolean> | null>(null);
  const fetchedForIndexRef = useRef<number | null>(null);

  const currentQuestion = questions[questionIndex];
  const loadedCount = questions.length;
  const totalQuestions = plannedTotalQuestions ?? loadedCount;
  const isLastQuestion = questionIndex === totalQuestions - 1;
  const isLastLoadedQuestion = questionIndex === loadedCount - 1;

  const finish = useCallback(
    (finalAnswers: QuizGameAnswerRecord[], finalScore: number) => {
      setIsFinished(true);
      onFinish?.({
        score: finalScore,
        answers: finalAnswers,
        correctCount: finalAnswers.filter((a) => a.isCorrect).length,
        // However many were actually answered -- matters when a batch
        // fetch fails and the quiz ends short of `plannedTotalQuestions`.
        totalQuestions: finalAnswers.length,
      });
    },
    [onFinish]
  );

  const answer = useCallback(
    (selected: string | null) => {
      if (hasAnswered || isFinished || !currentQuestion) return;

      const responseTimeMs = Date.now() - questionShownAt;
      const isCorrect = selected !== null && selected === currentQuestion.answer;
      const pointsAwarded = isCorrect ? computePoints(remainingMs, timeLimitMs, streak) : 0;

      const record: QuizGameAnswerRecord = {
        questionId: currentQuestion.id,
        selectedAnswer: selected,
        isCorrect,
        responseTimeMs,
        pointsAwarded,
      };

      setSelectedOption(selected);
      setHasAnswered(true);
      setLastIsCorrect(isCorrect);
      setLastPoints(pointsAwarded);
      setScore((prev) => prev + pointsAwarded);
      setStreak((prev) => {
        const next = isCorrect ? prev + 1 : 0;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });

      setAnswers((prev) => {
        const next = [...prev, record];
        onAnswer?.(record);
        return next;
      });
    },
    [hasAnswered, isFinished, currentQuestion, questionShownAt, remainingMs, timeLimitMs, streak, onAnswer]
  );

  const advanceToNextQuestion = useCallback(() => {
    setQuestionIndex((prev) => prev + 1);
    setSelectedOption(null);
    setHasAnswered(false);
    setLastIsCorrect(false);
    setLastPoints(0);
    setQuestionShownAt(Date.now());
    setRemainingMs(timeLimitMs);
  }, [timeLimitMs]);

  const goToNext = useCallback(() => {
    if (!hasAnswered) return;

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = undefined;
    }

    if (isLastQuestion) {
      finish(answers, score);
      return;
    }

    // The next batch was already loaded (the common case, fetched during
    // the reveal below) -- advance immediately.
    if (!pendingFetchRef.current) {
      advanceToNextQuestion();
      return;
    }

    // Still waiting on it: hold here and either advance or gracefully end
    // the quiz at the current count once it settles.
    pendingFetchRef.current.then((gotMore) => {
      if (gotMore) advanceToNextQuestion();
      else finish(answers, score);
    });
  }, [hasAnswered, isLastQuestion, finish, answers, score, advanceToNextQuestion]);

  // Proactively fetches the next batch as soon as the reveal for the last
  // *loaded* question starts, well before the ~2s auto-advance timer fires
  // -- so in the common case it's already done by the time goToNext runs.
  useEffect(() => {
    if (!hasAnswered || isFinished || isLastQuestion || !isLastLoadedQuestion) return;
    if (!onNeedMoreQuestions || fetchedForIndexRef.current === questionIndex) return;

    fetchedForIndexRef.current = questionIndex;
    setIsLoadingMore(true);
    pendingFetchRef.current = onNeedMoreQuestions().finally(() => {
      pendingFetchRef.current = null;
      setIsLoadingMore(false);
    });
  }, [hasAnswered, isFinished, isLastQuestion, isLastLoadedQuestion, questionIndex, onNeedMoreQuestions]);

  // Per-question countdown -- mirrors the existing timed-mode MCQ flow
  // (src/components/MCQ.tsx): poll the clock rather than trusting interval
  // drift, and auto-submit a null (incorrect) answer at zero.
  useEffect(() => {
    if (hasAnswered || isFinished || !currentQuestion) return;

    const interval = setInterval(() => {
      const remaining = timeLimitMs - (Date.now() - questionShownAt);
      if (remaining <= 0) {
        setRemainingMs(0);
        clearInterval(interval);
        answer(null);
      } else {
        setRemainingMs(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnswered, isFinished, currentQuestion, questionShownAt, timeLimitMs]);

  // Auto-advance to the next question after the reveal, unless the caller
  // is holding (e.g. a checkAnswer network call is still in flight).
  useEffect(() => {
    if (!hasAnswered || isFinished || holdAdvance) return;

    advanceTimerRef.current = setTimeout(goToNext, KAHOOT_REVEAL_MS);
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnswered, isFinished, holdAdvance]);

  return {
    currentQuestion,
    questionIndex,
    totalQuestions,
    isLastQuestion,
    score,
    streak,
    bestStreak,
    timeLimitMs,
    remainingMs,
    selectedOption,
    hasAnswered,
    isCorrect: lastIsCorrect,
    lastPoints,
    isFinished,
    isLoadingMore,
    answers,
    selectOption: answer,
    goToNext,
  };
}
