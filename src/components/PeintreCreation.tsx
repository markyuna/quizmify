"use client";

import * as React from "react";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "./ui/use-toast";
import LoadingQuestions from "./LoadingQuestions";
import PeintreHeader from "./games/PeintreHeader";
import InsufficientNeuronsCta from "./games/InsufficientNeuronsCta";
import { PEINTRE_COST_PER_GAME } from "@/lib/neurons/costs";
import { PEINTRE_DECKS, peintreImageUrl } from "@/lib/peintre/decks";

type Eligibility = {
  isPro: boolean;
  neuronsBalance: number;
  cost: number;
  freeGameAvailableToday: boolean;
};

export default function PeintreCreation() {
  const t = useTranslations("Peintre");
  const router = useRouter();
  const { toast } = useToast();

  const [eligibility, setEligibility] = React.useState<Eligibility | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [deckKey, setDeckKey] = React.useState<string>(PEINTRE_DECKS[0]?.deckKey ?? "");
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
      .get<Eligibility>("/api/peintre/eligibility")
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

  const cost = eligibility?.cost ?? PEINTRE_COST_PER_GAME;
  const freeToday = eligibility?.freeGameAvailableToday ?? false;
  const balance = eligibility?.neuronsBalance ?? 0;
  const canAfford = freeToday || balance >= cost;
  const missing = Math.max(0, cost - balance);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (showLoader || !deckKey || !canAfford) return;

    setShowLoader(true);
    try {
      const res = await axios.post<{ gameId: string }>("/api/peintre", { deckKey });
      setFinished(true);
      navTimeout.current = setTimeout(() => router.push(`/peintre/${res.data.gameId}`), 700);
    } catch (err) {
      setShowLoader(false);
      const code = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string } | undefined)?.error
        : null;
      toast({
        title: t("errorTitle"),
        description: code === "INSUFFICIENT_NEURONS" ? t("errorInsufficient") : t("errorGeneric"),
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
      <PeintreHeader />

      <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {t("deckLabel")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {PEINTRE_DECKS.map((deck) => {
            const selected = deckKey === deck.deckKey;
            return (
              <button
                key={deck.deckKey}
                type="button"
                onClick={() => setDeckKey(deck.deckKey)}
                aria-pressed={selected}
                className={cn(
                  "group relative overflow-hidden rounded-xl border text-left transition",
                  selected
                    ? "border-violet-400 ring-2 ring-violet-500/30 dark:border-violet-500/60"
                    : "border-slate-200 hover:border-violet-300 dark:border-white/10 dark:hover:border-violet-500/30"
                )}
              >
                <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-white/10">
                  <Image
                    src={peintreImageUrl(deck, deck.coverSlug)}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 45vw, 220px"
                    className="object-cover"
                  />
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {t(`decks.${deck.deckKey}.title`)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("deckQuestionCount", { count: deck.questions.length })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canAfford || !deckKey}
        className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-xl disabled:opacity-50"
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
