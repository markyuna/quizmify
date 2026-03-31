"use client";

import * as React from "react";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CopyCheck } from "lucide-react";

import { quizCreationSchema } from "@/schemas/form/quiz";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import LoadingQuestions from "./LoadingQuestions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";

type QuizCreationProps = {
  topicParam: string;
};

type QuizCreationInput = z.infer<typeof quizCreationSchema>;

export default function QuizCreation({ topicParam }: QuizCreationProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [showLoader, setShowLoader] = React.useState(false);
  const [finished, setFinished] = React.useState(false);

  const normalizedTopic =
    topicParam && topicParam !== "undefined" && topicParam !== "null"
      ? topicParam
      : "";

  const form = useForm<QuizCreationInput>({
    resolver: zodResolver(quizCreationSchema),
    defaultValues: {
      topic: normalizedTopic,
      amount: 3,
      difficulty: "easy",
      type: "mcq",
    },
  });

  const { mutate: createGame, isPending } = useMutation({
    mutationFn: async (values: QuizCreationInput) => {
      const response = await axios.post("/api/game", values);
      return response.data;
    },
    onSuccess: (data) => {
      if (!data?.gameId) {
        setShowLoader(false);
        toast({
          title: "Error",
          description: "The server did not return a game ID.",
          variant: "destructive",
        });
        return;
      }

      setFinished(true);

      setTimeout(() => {
        router.push(`/play/mcq/${data.gameId}`);
      }, 800);
    },
    onError: (error) => {
      setShowLoader(false);

      if (error instanceof AxiosError) {
        toast({
          title: "Error",
          description:
            error.response?.data?.error ?? "Unable to create the quiz.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Error",
        description: "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: QuizCreationInput) => {
    setShowLoader(true);
    createGame(values);
  };

  if (showLoader) {
    return <LoadingQuestions finished={finished} />;
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center px-4 py-10">
      <Card className="w-full border-white/10 bg-slate-950/70 text-white backdrop-blur">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Create a Quiz</CardTitle>
          <CardDescription className="text-slate-300">
            Choose a topic, difficulty, and number of questions.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter a topic..."
                        {...field}
                        value={field.value ?? ""}
                        className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                      />
                    </FormControl>
                    <FormDescription className="text-slate-400">
                      Example: JavaScript, History, Biology...
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      >
                        <option value="easy" className="text-black">
                          Easy
                        </option>
                        <option value="medium" className="text-black">
                          Medium
                        </option>
                        <option value="hard" className="text-black">
                          Hard
                        </option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Questions</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        {...field}
                        className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                      />
                    </FormControl>
                    <FormDescription className="text-slate-400">
                      Choose between 1 and 20 questions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="overflow-hidden rounded-xl border border-white/10">
                <Button
                  type="button"
                  className="h-12 w-full rounded-none bg-gradient-to-r from-violet-600 to-cyan-500 text-base font-semibold text-white hover:opacity-90"
                  onClick={() => form.setValue("type", "mcq")}
                >
                  <CopyCheck className="mr-2 h-4 w-4" />
                  Multiple Choice
                </Button>
              </div>

              <Button
                disabled={isPending}
                type="submit"
                className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90"
              >
                {isPending ? "Creating Quiz..." : "Create Quiz"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}