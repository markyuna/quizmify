"use client";

import * as React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Minus, Plus, Zap, PartyPopper, Puzzle, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

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
import { useGuestId } from "@/hooks/useGuestRound";
import { CATEGORIES } from "@/lib/categories";
import { setSessionCategoryForGame } from "@/lib/categoryTopicSession";
import type { CategoryTopicLookupResponse } from "@/app/api/category-topics/lookup/route";

type QuizCreationProps = {
  topicParam: string;
  // A real category slug, only when the user arrived here via a category
  // catalog card (see /quiz/categoria/[slug]) -- see the categoryKnown
  // derivation below for why that hides the selector entirely.
  categoryParam?: string;
  isGuest: boolean;
};

const GUEST_MAX_QUESTIONS = 5;

type QuizCreationInput = z.output<typeof quizCreationSchema>;

type CreateGameResponse = {
  gameId?: string;
};

const TOPIC_SUGGESTIONS = ["JavaScript", "History", "Biology", "Space", "Movies", "Math"];

export default function QuizCreation({ topicParam, categoryParam = "", isGuest }: QuizCreationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("QuizCreation");
  const tCategories = useTranslations("Categories");
  const locale = useLocale();
  // Mints/reads the quizmify_guest cookie so it exists before the first
  // POST /api/game -- the server reads it directly from the cookie, this
  // call is only here to guarantee it's set in time.
  useGuestId();

  const DIFFICULTIES = [
    { value: "easy" as const, label: t("difficultyEasy"), emoji: "🟢", desc: t("difficultyEasyDesc") },
    { value: "medium" as const, label: t("difficultyMedium"), emoji: "🟡", desc: t("difficultyMediumDesc") },
    { value: "hard" as const, label: t("difficultyHard"), emoji: "🔴", desc: t("difficultyHardDesc") },
  ];

  const [showLoader, setShowLoader] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  // Guests skip the eligibility check entirely: that route requires a
  // session and would 401, which would otherwise leave the form stuck in
  // "checkingEligibility" forever.
  const [checkingEligibility, setCheckingEligibility] = React.useState(!isGuest);
  const [isPro, setIsPro] = React.useState(false);
  // Purely a client-side routing choice (which play screen to land on after
  // creation) -- not part of quizCreationSchema, so it isn't sent to the
  // backend and doesn't affect how the game/questions are generated.
  // Mutually exclusive with puzzleMode: party mode always lands on the
  // Kahoot-style screen, which doesn't render the puzzle reveal.
  const [partyMode, setPartyMode] = React.useState(false);
  const [selectedCategorySlug, setSelectedCategorySlug] = React.useState("");
  const [categoryLookup, setCategoryLookup] = React.useState<{
    exists: boolean;
    categoryName: string | null;
  } | null>(null);
  const navigationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
    };
  }, []);

  // Defense-in-depth: a stale (bfcache/back-forward) client render of this
  // form must not be trusted. Re-check the real cap against the server on
  // every mount before letting the user interact with the form — the actual
  // enforcement lives server-side in POST /api/game, this just avoids
  // flashing a form the request would reject anyway.
  React.useEffect(() => {
    if (isGuest) return;

    let cancelled = false;

    axios
      .get<{ eligible: boolean; isPro: boolean }>("/api/game/eligibility")
      .then((res) => {
        if (cancelled) return;
        if (!res.data.eligible) {
          router.replace("/upgrade?limit=true");
          return;
        }
        setIsPro(res.data.isPro);
        setCheckingEligibility(false);
      })
      .catch(() => {
        if (!cancelled) setCheckingEligibility(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router, isGuest]);

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
      isTimed: false,
      puzzleMode: false,
    },
  });

  const amount = useWatch({ control: form.control, name: "amount" });
  const puzzleMode = useWatch({ control: form.control, name: "puzzleMode" });
  const topicValue = useWatch({ control: form.control, name: "topic" }) ?? "";

  // True only when the player arrived via a category catalog card (a real
  // categoryParam) and hasn't since edited the prefilled topic -- we already
  // know its category, so the selector below stays hidden. Editing the
  // topic makes it a genuinely different quiz, which falls back to the
  // normal lookup/selector flow.
  const categoryKnown = categoryParam !== "" && topicValue === normalizedTopic;

  // Debounced "is this topic already in the catalog?" check that drives the
  // selector's default selection and its "already in X" hint -- see
  // /api/category-topics/lookup. Never runs for guests (they never reach
  // /api/quiz/submit, so a category choice would just be discarded) or once
  // categoryKnown is true.
  React.useEffect(() => {
    if (isGuest || categoryKnown) return;

    const trimmedTopic = topicValue.trim();
    if (!trimmedTopic) {
      setCategoryLookup(null);
      setSelectedCategorySlug("");
      return;
    }

    let cancelled = false;
    const handle = setTimeout(() => {
      axios
        .get<CategoryTopicLookupResponse>("/api/category-topics/lookup", {
          params: { topic: trimmedTopic, locale },
        })
        .then((res) => {
          if (cancelled) return;
          setCategoryLookup({ exists: res.data.exists, categoryName: res.data.categoryName });
          setSelectedCategorySlug(res.data.exists && res.data.categorySlug ? res.data.categorySlug : "");
        })
        .catch(() => {
          if (!cancelled) setCategoryLookup(null);
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [topicValue, isGuest, categoryKnown, locale]);

  // What actually gets bridged to /api/quiz/submit via sessionStorage --
  // either the category we already knew (from the catalog card) or whatever
  // the player picked/accepted in the selector below.
  const effectiveCategorySlug = categoryKnown ? categoryParam : selectedCategorySlug;

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

      // Bridges the chosen category to /api/quiz/submit later, from
      // /play/mcq/[gameId] or /play/kahoot/[gameId] -- see
      // categoryTopicSession.ts for why this is client-side, not a Game
      // field. Guests never reach that submit call, so there's nothing to
      // bridge for them (effectiveCategorySlug is always "" while isGuest).
      if (!isGuest && effectiveCategorySlug) {
        setSessionCategoryForGame(data.gameId, effectiveCategorySlug);
      }

      setFinished(true);

      const destination =
        partyMode && !puzzleMode ? `/play/kahoot/${data.gameId}` : `/play/mcq/${data.gameId}`;
      navigationTimeoutRef.current = setTimeout(() => {
        router.push(destination);
      }, 800);
    },
    onError: (error) => {
      setShowLoader(false);

      if (axios.isAxiosError(error)) {
        const errorCode = (error.response?.data as { error?: string } | undefined)?.error;

        if (error.response?.status === 403 && errorCode === "FREE_LIMIT_REACHED") {
          toast({
            title: t("freeLimitTitle"),
            description: t("freeLimitDescription"),
            variant: "destructive",
          });
          router.push("/upgrade");
          return;
        }

        if (error.response?.status === 403 && errorCode === "GUEST_LIMIT_REACHED") {
          toast({
            title: t("guestLimitTitle"),
            description: t("guestLimitDescription"),
            variant: "destructive",
          });
          return;
        }

        if (error.response?.status === 403 && errorCode === "PUZZLE_REQUIRES_PRO") {
          toast({
            title: t("puzzleRequiresProTitle"),
            description: t("puzzleRequiresProDescription"),
            variant: "destructive",
          });
          router.push("/upgrade");
          return;
        }

        if (
          errorCode === "PUZZLE_IMAGE_GENERATION_FAILED" ||
          errorCode === "PUZZLE_IMAGE_STORAGE_UNAVAILABLE"
        ) {
          toast({
            title: t("errorTitle"),
            description: t("errorPuzzleImageFailed"),
            variant: "destructive",
          });
          return;
        }

        toast({
          title: t("errorTitle"),
          description: errorCode ?? t("errorUnableToCreate"),
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

  if (checkingEligibility) {
    return null;
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

            {!isGuest && !categoryKnown && (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("categoryLabel")}
                </FormLabel>
                <FormControl>
                  <select
                    value={selectedCategorySlug}
                    onChange={(event) => setSelectedCategorySlug(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">{t("categoryNone")}</option>
                    {CATEGORIES.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.icon} {tCategories(`${category.slug}.name`)}
                      </option>
                    ))}
                  </select>
                </FormControl>
                {categoryLookup?.exists && categoryLookup.categoryName && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t("categoryAlreadyIn", { category: categoryLookup.categoryName })}
                  </p>
                )}
              </FormItem>
            )}

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
                        onClick={() =>
                          field.onChange(
                            Math.min(isGuest ? GUEST_MAX_QUESTIONS : 20, field.value + 1)
                          )
                        }
                        disabled={field.value >= (isGuest ? GUEST_MAX_QUESTIONS : 20)}
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

            <FormField
              control={form.control}
              name="isTimed"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all duration-200",
                        field.value
                          ? "border-amber-400 bg-amber-50 shadow-sm shadow-amber-200 dark:border-amber-500/50 dark:bg-amber-500/15"
                          : "border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            field.value
                              ? "bg-amber-400/20 text-amber-600 dark:text-amber-300"
                              : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                          )}
                        >
                          <Zap className="h-4.5 w-4.5" />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                            {t("timedModeLabel")}
                          </span>
                          <span className="block text-xs text-slate-400">
                            {t("timedModeDesc")}
                          </span>
                        </span>
                      </span>

                      <span
                        className={cn(
                          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                          field.value ? "bg-amber-500" : "bg-slate-300 dark:bg-white/20"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                            field.value ? "translate-x-[22px]" : "translate-x-0.5"
                          )}
                        />
                      </span>
                    </button>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isGuest && (
            <button
              type="button"
              onClick={() => {
                setPartyMode((prev) => {
                  const next = !prev;
                  if (next) form.setValue("puzzleMode", false);
                  return next;
                });
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all duration-200",
                partyMode
                  ? "border-fuchsia-400 bg-fuchsia-50 shadow-sm shadow-fuchsia-200 dark:border-fuchsia-500/50 dark:bg-fuchsia-500/15"
                  : "border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    partyMode
                      ? "bg-fuchsia-400/20 text-fuchsia-600 dark:text-fuchsia-300"
                      : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                  )}
                >
                  <PartyPopper className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                    {t("partyModeLabel")}
                  </span>
                  <span className="block text-xs text-slate-400">{t("partyModeDesc")}</span>
                </span>
              </span>

              <span
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                  partyMode ? "bg-fuchsia-500" : "bg-slate-300 dark:bg-white/20"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                    partyMode ? "translate-x-[22px]" : "translate-x-0.5"
                  )}
                />
              </span>
            </button>
            )}

            {!isGuest && (
            <FormField
              control={form.control}
              name="puzzleMode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isPro) {
                          router.push("/upgrade");
                          return;
                        }
                        const next = !field.value;
                        field.onChange(next);
                        if (next) setPartyMode(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all duration-200",
                        !isPro
                          ? "border-slate-200 bg-slate-50/60 opacity-70 dark:border-white/10 dark:bg-white/5"
                          : field.value
                            ? "border-emerald-400 bg-emerald-50 shadow-sm shadow-emerald-200 dark:border-emerald-500/50 dark:bg-emerald-500/15"
                            : "border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            field.value && isPro
                              ? "bg-emerald-400/20 text-emerald-600 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                          )}
                        >
                          <Puzzle className="h-4.5 w-4.5" />
                        </span>
                        <span>
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                            {t("puzzleModeLabel")}
                            {!isPro && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                                <Lock className="h-2.5 w-2.5" />
                                {t("puzzleModeProBadge")}
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-slate-400">{t("puzzleModeDesc")}</span>
                        </span>
                      </span>

                      <span
                        className={cn(
                          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                          field.value && isPro ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/20"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                            field.value && isPro ? "translate-x-[22px]" : "translate-x-0.5"
                          )}
                        />
                      </span>
                    </button>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {isGuest && (
              <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("guestNotice")}
              </p>
            )}

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
