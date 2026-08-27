"use client";

import * as React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "./ui/use-toast";
import LoadingQuestions from "./LoadingQuestions";
import type { PuzzleDuJourDifficulty } from "@/lib/puzzleDuJour";

const DIFFICULTIES: PuzzleDuJourDifficulty[] = ["easy", "medium", "hard"];

type TopicSuggestion = { topic: string; topicNormalized: string };

export default function PuzzleDuJourCreation() {
  const t = useTranslations("PuzzleDuJour");
  const router = useRouter();
  const { toast } = useToast();

  const [isPro, setIsPro] = React.useState(false);
  const [remainingToday, setRemainingToday] = React.useState<number | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [topic, setTopic] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<PuzzleDuJourDifficulty>("easy");
  const [suggestions, setSuggestions] = React.useState<TopicSuggestion[]>([]);
  const [showLoader, setShowLoader] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const navigationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    axios
      .get<{ isPro: boolean; remainingToday: number }>("/api/puzzle-du-jour/eligibility")
      .then((res) => {
        if (cancelled) return;
        setIsPro(res.data.isPro);
        setRemainingToday(res.data.remainingToday);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    axios
      .get<{ suggestions: TopicSuggestion[] }>("/api/puzzle-du-jour/suggestions")
      .then((res) => {
        if (!cancelled) setSuggestions(res.data.suggestions);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const locked = !isPro;
  const atLimit = isPro && remainingToday === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) {
      router.push("/upgrade");
      return;
    }
    if (atLimit || showLoader || !topic.trim()) return;

    setShowLoader(true);
    try {
      const res = await axios.post<{ gameId: string }>("/api/puzzle-du-jour", { topic, difficulty });
      setFinished(true);
      navigationTimeoutRef.current = setTimeout(() => {
        router.push(`/puzzle-du-jour/${res.data.gameId}`);
      }, 800);
    } catch (err) {
      setShowLoader(false);
      const code = axios.isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : null;
      toast({
        title: t("errorTitle"),
        description:
          code === "PUZZLE_DU_JOUR_TOPIC_BLOCKED"
            ? t("errorTopicBlocked")
            : code === "PUZZLE_DU_JOUR_DAILY_LIMIT_REACHED"
              ? t("errorDailyLimit")
              : t("errorGeneric"),
        variant: "destructive",
      });
    }
  }

  if (showLoader) {
    return (
      <LoadingQuestions
        finished={finished}
        loadingTexts={t.raw("loadingTexts") as string[]}
        secondaryLine={t("loadingSecondaryLine")}
      />
    );
  }

  if (checking) return null;

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-lg space-y-4">
      <div
        className={cn(
          "rounded-2xl border p-4",
          locked
            ? "border-slate-200 bg-slate-50/60 opacity-70 dark:border-white/10 dark:bg-white/5"
            : "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/5"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
            {t("title")}
            {locked && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                <Lock className="h-2.5 w-2.5" />
                {t("proBadge")}
              </span>
            )}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">{t("description")}</p>

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={locked}
          placeholder={t("topicPlaceholder")}
          maxLength={200}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
        />

        {/* Nudges picks toward already-cached topics (see the
            topicNormalized+language cache lookup in POST /api/puzzle-du-jour)
            -- clicking only fills the input, it never submits on its own. */}
        {suggestions.length > 0 && (
          <div className="mt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t("suggestionsLabel")}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.topicNormalized}
                  type="button"
                  disabled={locked}
                  onClick={() => setTopic(s.topic)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
                >
                  {s.topic}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              disabled={locked}
              onClick={() => setDifficulty(d)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                difficulty === d
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300"
              )}
            >
              {t(`difficulty.${d}`)}
            </button>
          ))}
        </div>

        {isPro && remainingToday !== null && (
          <p className="mt-2 text-xs text-slate-400">{t("remainingToday", { count: remainingToday })}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={atLimit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        {locked ? t("unlockCta") : t("generateCta")}
      </button>
    </form>
  );
}
