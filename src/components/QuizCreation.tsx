"use client";

import * as React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { quizCreationSchema } from "@/schemas/form/quiz";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import LoadingQuestions from "./LoadingQuestions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { cn } from "@/lib/utils";

type QuizCreationProps = {
  topicParam: string;
};

type QuizCreationInput = z.output<typeof quizCreationSchema>;

type CreateGameResponse = {
  gameId?: string;
};

const TOPIC_SUGGESTIONS = ["JavaScript", "History", "Biology", "Space", "Movies", "Math"];

export default function QuizCreation({ topicParam }: QuizCreationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("QuizCreation");

  const DIFFICULTIES = [
    { value: "easy" as const, label: t("difficultyEasy"), emoji: "🟢", desc: t("difficultyEasyDesc") },
    { value: "medium" as const, label: t("difficultyMedium"), emoji: "🟡", desc: t("difficultyMediumDesc") },
    { value: "hard" as const, label: t("difficultyHard"), emoji: "🔴", desc: t("difficultyHardDesc") },
  ];

  const [showLoader, setShowLoader] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const navigationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
    };
  }, []);

  const normalizedTopic =
    topicParam && topicParam !== "undefined" && topicParam !== "null"
      ? topicParam
      : "";

  const form = useForm<QuizCreationInput>({
    resolver: zodResolver(quizCreationSchema),
    defaultValues: {
      topic: normalizedTopic,
      amount: 5,
      difficulty: "easy",
      type: "mcq",
    },
  });

  const difficulty = form.watch("difficulty");
  const amount = form.watch("amount");

  const { mutate: createGame, isPending } = useMutation({
    mutationFn: async (values: QuizCreationInput) => {
      const response = await axios.post<CreateGameResponse>("/api/game", values);
      return response.data;
    },
    onSuccess: (data) => {
      if (!data?.gameId) {
        setShowLoader(false);
        toast({
          title: t("errorTitle"),
          description: t("errorNoGameId"),
          variant: "destructive",
        });
        return;
      }

      setFinished(true);

      navigationTimeoutRef.current = setTimeout(() => {
        router.push(`/play/mcq/${data.gameId}`);
      }, 800);
    },
    onError: (error) => {
      setShowLoader(false);

      if (axios.isAxiosError(error)) {
        toast({
          title: t("errorTitle"),
          description:
            (error.response?.data as { error?: string } | undefined)?.error ??
            t("errorUnableToCreate"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("errorTitle"),
        description: t("errorGeneric"),
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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 sm:py-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5" />
          {t("badge")}
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("topicLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("topicPlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                      className="h-12 rounded-2xl border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </FormControl>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {TOPIC_SUGGESTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => form.setValue("topic", t)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("difficultyLabel")}
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      {DIFFICULTIES.map(({ value, label, emoji, desc }) => {
                        const selected = field.value === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-all duration-200",
                              selected
                                ? "border-violet-400 bg-violet-50 shadow-sm shadow-violet-200 dark:border-violet-500/50 dark:bg-violet-500/15"
                                : "border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                            )}
                          >
                            <span className="text-xl">{emoji}</span>
                            <span
                              className={cn(
                                "text-sm font-bold",
                                selected
                                  ? "text-violet-700 dark:text-violet-300"
                                  : "text-slate-700 dark:text-slate-200"
                              )}
                            >
                              {label}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
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
                  <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("amountLabel")}
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-2 dark:border-white/10 dark:bg-white/5">
                      <button
                        type="button"
                        onClick={() => field.onChange(Math.max(1, field.value - 1))}
                        disabled={field.value <= 1}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-30 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <div className="text-center">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">
                          {field.value}
                        </span>
                        <p className="text-xs text-slate-400">
                          {field.value === 1 ? t("questionSingular") : t("questionPlural")}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => field.onChange(Math.min(20, field.value + 1))}
                        disabled={field.value >= 20}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-30 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              disabled={isPending}
              type="submit"
              className="h-13 w-full rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 text-base font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t("creating")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t("generate")} {amount} {amount !== 1 ? t("questionPlural") : t("questionSingular")}
                </span>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
