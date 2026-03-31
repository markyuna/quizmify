"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { z } from "zod";
import { differenceInSeconds } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import {
  BarChart,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Timer,
} from "lucide-react";
import { Game, Question } from "@/generated/prisma/client";
import { AnimatePresence, motion } from "framer-motion";

import BlankAnswerInput from "./BlankAnswerInput";
import OpenEndedPercentage from "./OpenEndedPercentage";
import QuizProgress from "./QuizProgress";
import { Button, buttonVariants } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "./ui/use-toast";
import { checkAnswerSchema } from "@/schemas/form/quiz";
import { cn, formatTimeDelta } from "@/lib/utils";

type OpenEndedProps = {
  game: Game & {
    questions: Pick<Question, "id" | "question" | "answer">[];
  };
};

export default function OpenEnded({ game }: OpenEndedProps) {
  const { toast } = useToast();

  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [blankAnswer, setBlankAnswer] = React.useState("");
  const [averagePercentage, setAveragePercentage] = React.useState(0);
  const [hasEnded, setHasEnded] = React.useState(false);
  const [now, setNow] = React.useState(new Date());
  const [feedback, setFeedback] = React.useState("");

  const currentQuestion = React.useMemo(() => {
    return game.questions[questionIndex];
  }, [game.questions, questionIndex]);

  React.useEffect(() => {
    if (hasEnded) return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [hasEnded]);

  const { mutate: checkAnswer, isPending: isChecking } = useMutation({
    mutationFn: async () => {
      const payload: z.infer<typeof checkAnswerSchema> = {
        questionId: currentQuestion.id,
        userAnswer: blankAnswer,
      };

      const response = await axios.post("/api/checkAnswer", payload);
      return response.data;
    },
  });

  const handleNext = React.useCallback(() => {
    if (isChecking) return;

    if (!blankAnswer.trim()) {
      toast({
        title: "Answer required",
        description: "Please fill in the blanks before continuing.",
        variant: "destructive",
      });
      return;
    }

    checkAnswer(undefined, {
      onSuccess: async ({ percentageSimilar }) => {
        setFeedback(
          `Your answer is ${percentageSimilar}% similar to the correct answer.`
        );

        setAveragePercentage((prev) => {
          const totalSoFar = prev * questionIndex;
          return (totalSoFar + percentageSimilar) / (questionIndex + 1);
        });

        const isLastQuestion = questionIndex === game.questions.length - 1;

        await new Promise((resolve) => setTimeout(resolve, 900));

        if (isLastQuestion) {
          setHasEnded(true);
          return;
        }

        setQuestionIndex((prev) => prev + 1);
        setBlankAnswer("");
        setFeedback("");
      },
      onError: (error) => {
        console.error(error);
        toast({
          title: "Something went wrong",
          description: "We could not check your answer.",
          variant: "destructive",
        });
      },
    });
  }, [blankAnswer, checkAnswer, game.questions.length, isChecking, questionIndex, toast]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        handleNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleNext]);

  if (hasEnded) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 py-10">
        <Card className="w-full text-center shadow-lg">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Quiz completed</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              You completed this quiz in{" "}
              <span className="font-semibold text-foreground">
                {formatTimeDelta(differenceInSeconds(now, game.timeStarted))}
              </span>
            </p>

            <div className="flex justify-center">
              <OpenEndedPercentage percentage={averagePercentage} />
            </div>

            <Link
              href={`/statistics/${game.id}`}
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              View Statistics
              <BarChart className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
                    {game.topic}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Timer className="mr-2 h-4 w-4" />
                    {formatTimeDelta(differenceInSeconds(now, game.timeStarted))}
                  </div>
                </div>

                <div className="sm:min-w-[220px]">
                  <QuizProgress
                    current={questionIndex + 1}
                    total={game.questions.length}
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-6 shadow-sm">
                <div className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Open-ended question
                </div>

                <AnimatePresence mode="wait">
                  <motion.h2
                    key={currentQuestion.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl font-semibold leading-snug"
                  >
                    {currentQuestion.question}
                  </motion.h2>
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div className="text-sm text-muted-foreground">
                Fill in the missing words, then continue.
              </div>

              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <BlankAnswerInput
                  answer={currentQuestion.answer}
                  onAnswerChange={setBlankAnswer}
                />
              </motion.div>
            </CardContent>
          </Card>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                className="min-w-[180px] rounded-xl"
                size="lg"
                disabled={isChecking}
                onClick={handleNext}
              >
                {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>

        <aside className="space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Similarity</CardTitle>
            </CardHeader>
            <CardContent>
              <OpenEndedPercentage percentage={averagePercentage} />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Shortcut</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Press Enter to continue
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}