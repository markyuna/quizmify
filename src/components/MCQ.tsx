"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { differenceInSeconds } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Timer,
  XCircle,
  BarChart3,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Game, Question } from "@/generated/prisma/client";

import MCQCounter from "./MCQCounter";
import { Button, buttonVariants } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "./ui/use-toast";
import { cn, formatTimeDelta } from "@/lib/utils";

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
};

const MCQ = ({ game }: MCQProps) => {
  const { toast } = useToast();

  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [now, setNow] = React.useState(new Date());
  const [timeStartedAt, setTimeStartedAt] = React.useState<Date>(
    new Date(game.timeStarted)
  );
  const [finalElapsedSeconds, setFinalElapsedSeconds] = React.useState<
    number | null
  >(null);
  const [answers, setAnswers] = React.useState<AnswerRecord[]>([]);
  const [lastCorrectAnswer, setLastCorrectAnswer] = React.useState<string | null>(
    null
  );
  const [lastAnswerWasCorrect, setLastAnswerWasCorrect] = React.useState<
    boolean | null
  >(null);
  const [quizFinished, setQuizFinished] = React.useState(false);
  const [finalResult, setFinalResult] =
    React.useState<SubmitQuizResponse | null>(null);

  const currentQuestion = game.questions[questionIndex];
  const isLastQuestion = questionIndex === game.questions.length - 1;

  const { mutate: checkAnswer, isPending: isCheckingAnswer } = useMutation({
    mutationFn: async ({
      questionId,
      userAnswer,
    }: {
      questionId: string;
      userAnswer: string;
    }) => {
      const response = await axios.post<CheckAnswerResponse>("/api/checkAnswer", {
        questionId,
        userAnswer,
      });

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
        toast({
          title: "Correct answer ✅",
          description: "Nice job — you picked the right answer.",
        });
      } else {
        toast({
          title: "Wrong answer ❌",
          description: `The correct answer was: ${correctAnswer}`,
          variant: "destructive",
        });
      }

      setAnswers((prev) => {
        const filtered = prev.filter(
          (answer) => answer.questionId !== variables.questionId
        );

        return [
          ...filtered,
          {
            questionId: variables.questionId,
            selectedAnswer: variables.userAnswer,
            isCorrect,
          },
        ];
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Unable to check your answer.",
        variant: "destructive",
      });
    },
  });

  const { mutate: submitQuiz, isPending: isSubmittingQuiz } = useMutation({
    mutationFn: async (payload: {
      gameId: string;
      timeSpent: number;
      answers: { questionId: string; selectedAnswer: string }[];
    }) => {
      const response = await axios.post<SubmitQuizResponse>(
        "/api/quiz/submit",
        payload
      );
      return response.data;
    },
    onSuccess: (data) => {
      setFinalResult(data);
      setQuizFinished(true);

      toast({
        title: "Quiz completed 🎉",
        description: `Final score: ${data.score}%`,
      });
    },
    onError: () => {
      setFinalElapsedSeconds(null);

      toast({
        title: "Error",
        description: "Unable to save the final result.",
        variant: "destructive",
      });
    },
  });

  React.useEffect(() => {
    if (quizFinished || isSubmittingQuiz) return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [quizFinished, isSubmittingQuiz]);

  const handleSelect = (option: string) => {
    if (hasAnswered || isCheckingAnswer || isSubmittingQuiz) return;

    setSelectedAnswer(option);

    checkAnswer({
      questionId: currentQuestion.id,
      userAnswer: option,
    });
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
      answers: answers.map((answer) => ({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
      })),
    });
  };

  const handleRestartLocal = () => {
    const restartedAt = new Date();

    setQuestionIndex(0);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setScore(0);
    setNow(restartedAt);
    setTimeStartedAt(restartedAt);
    setFinalElapsedSeconds(null);
    setAnswers([]);
    setLastCorrectAnswer(null);
    setLastAnswerWasCorrect(null);
    setQuizFinished(false);
    setFinalResult(null);
  };

  const liveElapsedSeconds = differenceInSeconds(now, timeStartedAt);
  const displayedElapsedSeconds = finalElapsedSeconds ?? liveElapsedSeconds;

  const getOptionStyle = (option: string) => {
    const isCorrect = option === currentQuestion.answer;
    const isSelected = option === selectedAnswer;

    if (!hasAnswered) {
      return "border-black/10 bg-white/80 text-slate-800 hover:bg-white hover:border-cyan-400/50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:border-cyan-400/40";
    }

    if (isCorrect) {
      return "border-emerald-400/50 bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-white";
    }

    if (isSelected && !isCorrect) {
      return "border-rose-400/50 bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-white";
    }

    return "border-black/10 bg-white/60 text-slate-500 opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";
  };

  if (!currentQuestion && !quizFinished) {
    return (
      <div className="w-full rounded-[2rem] bg-gradient-to-br from-slate-100 via-white to-cyan-100 px-4 py-6 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950 sm:py-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Card className="rounded-3xl border border-black/5 bg-white/70 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                No questions found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href="/quiz"
                className={cn(
                  buttonVariants(),
                  "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                )}
              >
                Back to Quiz
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (quizFinished) {
    const totalQuestions = finalResult?.totalQuestions ?? game.questions.length;
    const correctAnswers = finalResult?.correctAnswers ?? score;
    const finalScore =
      finalResult?.score ?? Math.round((score / totalQuestions) * 100);

    return (
      <div className="w-full rounded-[2rem] bg-gradient-to-br from-slate-100 via-white to-cyan-100 px-4 py-6 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950 sm:py-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-500 dark:text-cyan-300">
              Quiz completed
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
              {game.topic}
            </h1>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-3xl border border-black/5 bg-white/70 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm text-slate-500 dark:text-slate-300">
                  Final Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-slate-900 dark:text-white">
                  {finalScore}%
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-black/5 bg-white/70 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm text-slate-500 dark:text-slate-300">
                  Correct Answers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-slate-900 dark:text-white">
                  {correctAnswers}/{totalQuestions}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-black/5 bg-white/70 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm text-slate-500 dark:text-slate-300">
                  Total Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-slate-900 dark:text-white">
                  {formatTimeDelta(displayedElapsedSeconds)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleRestartLocal}
              className="h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-white shadow-lg shadow-cyan-900/20 hover:opacity-95"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Replay Locally
            </Button>

            <Link
              href={`/statistics/${game.id}`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "h-12 rounded-2xl px-6"
              )}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              View Statistics
            </Link>

            {finalScore < 100 && (
              <Link
                href="/quiz/mistakes"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-12 rounded-2xl border-black/10 bg-white/70 px-6 text-slate-800 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                )}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Practice Mistakes
              </Link>
            )}

            <Link
              href="/quiz"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-12 rounded-2xl px-6 text-slate-600 hover:bg-black/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              )}
            >
              New Quiz
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[2rem] bg-gradient-to-br from-slate-100 via-white to-cyan-100 px-4 py-6 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950 sm:py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-500 dark:text-cyan-300">
                Quiz Challenge
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                {game.topic}
              </h1>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-3 text-cyan-700 dark:border-cyan-400/20 dark:text-cyan-100">
              <Timer className="h-5 w-5" />
              <span className="font-medium">
                {formatTimeDelta(displayedElapsedSeconds)}
              </span>
            </div>
          </div>

          <MCQCounter
            currentQuestionIndex={questionIndex}
            questionsLength={game.questions.length}
          />
        </div>

        <Card className="rounded-3xl border border-black/5 bg-white/70 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <CardTitle className="text-2xl font-bold leading-snug text-slate-900 dark:text-white">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4">
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
                      "group flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-medium transition-all duration-200 shadow-lg shadow-black/5 sm:px-5 sm:text-base",
                      getOptionStyle(option)
                    )}
                  >
                    <span className="min-w-0 break-words pr-3">{option}</span>

                    {hasAnswered && isCorrect && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-300" />
                    )}

                    {hasAnswered && isSelected && !isCorrect && (
                      <XCircle className="h-5 w-5 text-rose-500 dark:text-rose-300" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 space-y-3">
              {hasAnswered && lastAnswerWasCorrect === false && lastCorrectAnswer && (
                <div className="rounded-2xl border border-rose-300/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">
                  Correct answer:{" "}
                  <span className="font-semibold">{lastCorrectAnswer}</span>
                </div>
              )}

              {hasAnswered && lastAnswerWasCorrect === true && (
                <div className="rounded-2xl border border-emerald-300/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                  Correct — keep going.
                </div>
              )}

              {hasAnswered && currentQuestion.explanation && (
                <div className="rounded-2xl border border-cyan-300/50 bg-cyan-500/10 px-4 py-3 text-sm leading-6 text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-100">
                  <span className="font-semibold">Explanation:</span>{" "}
                  {currentQuestion.explanation}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                Score: <span className="font-bold text-slate-900 dark:text-white">{score}</span> /{" "}
                {game.questions.length}
              </div>

              {hasAnswered ? (
                <Button
                  onClick={handleNext}
                  disabled={isSubmittingQuiz}
                  className="h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-white shadow-lg shadow-cyan-900/20 hover:opacity-95"
                >
                  {isSubmittingQuiz ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {isLastQuestion ? "Finish Quiz" : "Next Question"}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {isCheckingAnswer ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking answer...
                    </>
                  ) : (
                    "Choose an answer"
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mx-auto text-slate-600 hover:bg-black/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
          )}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default MCQ;