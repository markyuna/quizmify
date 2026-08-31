"use client";

import * as React from "react";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "./ui/use-toast";
import LoadingQuestions from "./LoadingQuestions";
import PuzzleDuJourUnlockModal from "./PuzzleDuJourUnlockModal";
import PuzzleDuJourHeader from "./games/PuzzleDuJourHeader";
import type { PuzzleDuJourDifficulty } from "@/lib/puzzleDuJour";
import { NEURON_UNLOCK_COSTS } from "@/lib/neurons/costs";
import { resolvePuzzleDuJourAccess } from "@/lib/neurons/access";

const DIFFICULTIES: PuzzleDuJourDifficulty[] = ["easy", "medium", "hard"];

type TopicSuggestion = { topic: string; topicNormalized: string };

type EligibilityResponse = {
  isPro: boolean;
  remainingToday: number;
  neuronsBalance: number;
  hasAvailableTicket: boolean;
};

export default function PuzzleDuJourCreation() {
  const t = useTranslations("PuzzleDuJour");
  const router = useRouter();
  const { toast } = useToast();

  const [eligibility, setEligibility] = React.useState<EligibilityResponse | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [showUnlockModal, setShowUnlockModal] = React.useState(false);
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

  // A ref (not a per-effect closure var) because this same fetch is reused
  // on demand from the unlock modal's onUnlocked, not just on mount.
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchEligibility = React.useCallback(async () => {
    try {
      const res = await axios.get<EligibilityResponse>("/api/puzzle-du-jour/eligibility");
      if (mountedRef.current) setEligibility(res.data);
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, []);

  React.useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  React.useEffect(() => {
    let cancelled = false;
    axios
      .get<{ suggestions: TopicSuggestion[] }>("/api/puzzle-du-jour/suggestions")
      .then((res) => {
        if (!cancelled) setSuggestions(res.data.suggestions);
      })
      .catch((error) => {
        // Secondary feature -- failing silently in the UI is fine (the
        // section just doesn't render, same as a legitimately empty
        // result), but swallowing it completely made this exact bug
        // (mobile getting an empty array) indistinguishable from a real
        // request failure. Logged, not surfaced to the user.
        console.error("Failed to load Puzzle du Jour topic suggestions:", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const accessState = resolvePuzzleDuJourAccess({
    isPro: eligibility?.isPro ?? false,
    hasAvailableTicket: eligibility?.hasAvailableTicket ?? false,
    neuronsBalance: eligibility?.neuronsBalance ?? 0,
  });
  const isPro = accessState.kind === "pro";
  // Locked = the form (topic/suggestions/difficulty) stays disabled --
  // true unless Pro or already holding a ticket, matching the 2 states
  // that behave exactly like a normal, unrestricted creation.
  const locked = accessState.kind !== "pro" && accessState.kind !== "ticket_available";
  const atLimit = isPro && eligibility?.remainingToday === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (accessState.kind === "can_purchase") {
      setShowUnlockModal(true);
      return;
    }
    if (locked) return; // insufficient_balance -- button is disabled, nothing to do
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
      <PuzzleDuJourHeader />
      <div
        className={cn(
          "rounded-2xl border p-4",
          locked
            ? "border-slate-200 bg-slate-50/60 opacity-70 dark:border-white/10 dark:bg-white/5"
            : "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/5"
        )}
      >
        {/* Title + tagline live in <PuzzleDuJourHeader /> above -- only the
            locked-state Pro badge stays on the card itself. */}
        {locked && (
          <div className="mb-2 inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
            <Lock className="h-2.5 w-2.5" />
            {t("proBadge")}
          </div>
        )}

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={locked}
          placeholder={t("topicPlaceholder")}
          maxLength={200}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
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

        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("difficultyLabel")}
          </p>
          <div className="grid grid-cols-3 gap-2">
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
        </div>

        {isPro && eligibility?.remainingToday != null && (
          <p className="mt-2 text-xs text-slate-400">{t("remainingToday", { count: eligibility.remainingToday })}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={atLimit || accessState.kind === "insufficient_balance"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
      >
        {accessState.kind === "can_purchase" || accessState.kind === "insufficient_balance" ? (
          <Image src="/icono-neurona/neurona-hex-32.png" alt="" width={16} height={16} />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {accessState.kind === "can_purchase"
          ? t("unlockForCost", { cost: NEURON_UNLOCK_COSTS.puzzleDuJour })
          : accessState.kind === "insufficient_balance"
            ? t("missingNeurons", { missing: accessState.missing })
            : t("generateCta")}
      </button>

      <PuzzleDuJourUnlockModal
        open={showUnlockModal}
        onOpenChange={setShowUnlockModal}
        neuronsBalance={eligibility?.neuronsBalance ?? 0}
        onUnlocked={fetchEligibility}
      />
    </form>
  );
}
