"use client";

import * as React from "react";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "./ui/use-toast";
import LoadingQuestions from "./LoadingQuestions";
import CrucigramaHeader from "./games/CrucigramaHeader";
import CrucigramaExampleTopics from "./games/CrucigramaExampleTopics";
import InsufficientNeuronsCta from "./games/InsufficientNeuronsCta";
import { CRUCIGRAMA_COST_PER_GAME } from "@/lib/neurons/costs";
import { CRUCIGRAMA_DIFFICULTIES, type CrucigramaDifficulty } from "@/lib/crucigrama";

// Selected-state colour per difficulty -- same "border + translucent bg +
// text" chip pattern as PuzzleDuJourCreation.
const DIFFICULTY_SELECTED_STYLES: Record<CrucigramaDifficulty, string> = {
  easy: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-300",
  medium: "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-300",
  hard: "border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/15 dark:text-rose-300",
};

type Eligibility = {
  isPro: boolean;
  neuronsBalance: number;
  cost: number;
  freeGameAvailableToday: boolean;
};

export default function CrucigramaCreation() {
  const t = useTranslations("CrucigramaPage");
  const router = useRouter();
  const { toast } = useToast();

  const [eligibility, setEligibility] = React.useState<Eligibility | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [topic, setTopic] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<CrucigramaDifficulty>("easy");
  const [showLoader, setShowLoader] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const navTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (navTimeout.current) clearTimeout(navTimeout.current);
    },
    []
  );

  React.useEffect(() => {
    let cancelled = false;
    axios
      .get<Eligibility>("/api/crucigrama/eligibility")
      .then((res) => {
        if (!cancelled) setEligibility(res.data);
      })
      .catch(() => {
        // Fail open -- the POST still enforces the debit.
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cost = eligibility?.cost ?? CRUCIGRAMA_COST_PER_GAME;
  const freeToday = eligibility?.freeGameAvailableToday ?? false;
  const balance = eligibility?.neuronsBalance ?? 0;
  const canAfford = freeToday || balance >= cost;
  const missing = Math.max(0, cost - balance);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (showLoader || !topic.trim() || !canAfford) return;

    setShowLoader(true);
    try {
      const res = await axios.post<{ gameId: string }>("/api/crucigrama", { topic, difficulty });
      setFinished(true);
      navTimeout.current = setTimeout(() => router.push(`/crucigrama/${res.data.gameId}`), 700);
    } catch (err) {
      setShowLoader(false);
      const code = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string } | undefined)?.error
        : null;
      toast({
        title: t("errorTitle"),
        description:
          code === "INSUFFICIENT_NEURONS"
            ? t("errorInsufficient")
            : code === "CRUCIGRAMA_GENERATION_FAILED"
              ? t("errorGeneration")
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
      <CrucigramaHeader />

      <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t("topicPlaceholder")}
          maxLength={200}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
        />

        <CrucigramaExampleTopics onSelect={setTopic} />

        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("difficultyLabel")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {CRUCIGRAMA_DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                  difficulty === d
                    ? DIFFICULTY_SELECTED_STYLES[d]
                    : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300"
                )}
              >
                {t(`difficulty.${d}`)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">{t(`wordCount.${difficulty}`)}</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canAfford || !topic.trim()}
        className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-xl hover:shadow-cyan-500/20 disabled:opacity-50"
      >
        <span
          aria-hidden
          className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/25 motion-reduce:hidden"
        />
        {freeToday ? (
          <>
            <Sparkles className="h-4 w-4" />
            {t("generateCta")}
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {t.rich("unlockButton", {
              icon: () => (
                <Image src="/icono-neurona/neurona-hex-48.png" alt="" width={16} height={16} />
              ),
              cost,
            })}
          </span>
        )}
      </button>

      {freeToday && (
        <p className="text-center text-xs font-semibold text-emerald-600">{t("freeToday")}</p>
      )}
      {!canAfford && <InsufficientNeuronsCta missing={missing} />}
    </form>
  );
}
