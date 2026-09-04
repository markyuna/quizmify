"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { BarChart3, HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import InsufficientNeuronsCta from "@/components/games/InsufficientNeuronsCta";
import MorpionStatsModal from "@/components/games/MorpionStatsModal";
import MorpionHowToPlayModal from "@/components/games/MorpionHowToPlayModal";
import { MORPION_COST_PER_GAME } from "@/lib/neurons/costs";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const isDifficulty = (v: string): v is Difficulty => (DIFFICULTIES as readonly string[]).includes(v);

type Eligibility = {
  isPro: boolean;
  neuronsBalance: number;
  difficulty: string;
  cost: number;
  recentWinRatio: number;
  freeGameAvailableToday: boolean;
};

export default function MorpionPage() {
  const router = useRouter();
  const { status } = useSession();
  const t = useTranslations("MorpionPage");
  const { toast } = useToast();
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    const fetchEligibility = async () => {
      try {
        const res = await fetch("/api/morpion/eligibility");
        const data = (await res.json()) as Eligibility;
        setEligibility(data);
        // Pre-select the adaptively recommended difficulty; the player can override.
        if (typeof data.difficulty === "string" && isDifficulty(data.difficulty)) {
          setDifficulty(data.difficulty);
        }
      } catch (error) {
        console.error("Error fetching eligibility:", error);
        toast({ title: "Error", description: t("error"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchEligibility();
  }, [status, router, t, toast]);

  const handleCreateGame = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/morpion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          toast({
            title: "Neuronas insuficientes",
            description: t("insufficientNeurons"),
            variant: "destructive",
          });
        } else {
          throw new Error("Failed to create game");
        }
        return;
      }

      const data = await res.json();
      router.push(`/morpion/${data.gameId}`);
    } catch (error) {
      console.error("Error creating game:", error);
      toast({ title: "Error", description: t("error"), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  // A Pro with a free game left today can always play; otherwise (free user,
  // or Pro who already used today's free game) they need the Neurons.
  const cannotAfford =
    !!eligibility &&
    !eligibility.freeGameAvailableToday &&
    eligibility.neuronsBalance < eligibility.cost;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <div className="mx-auto max-w-md">
        <div className="mb-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowHowTo(true)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {t("howToPlayButton")}
          </button>
          <button
            type="button"
            onClick={() => setShowStats(true)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            {t("statsButton")}
          </button>
        </div>

        <svg
          viewBox="0 0 400 120"
          role="img"
          aria-label={t("title")}
          className="mb-4 w-full max-w-[300px] text-slate-900 dark:text-white"
        >
          <text
            x="200"
            y="82"
            textAnchor="middle"
            fontFamily="inherit"
            fontSize="72"
            fontWeight="700"
            fill="currentColor"
          >
            <tspan>M</tspan>
            <tspan fill="#ff6b6b" dy="12">O</tspan>
            <tspan fill="currentColor" dy="-12">RPI</tspan>
            <tspan fill="#8b5cf6" dy="-12">O</tspan>
            <tspan fill="currentColor" dy="12">N</tspan>
          </text>
        </svg>
        <p className="mb-6 text-slate-600 dark:text-slate-300">{t("description")}</p>

        {eligibility && (
          <div className="mb-8 space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("difficultyLabel")}</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    aria-pressed={difficulty === d}
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

            {!eligibility.isPro && (
              <>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("neuronsBalance")}</p>
                  <p
                    className={`text-lg font-bold ${
                      eligibility.neuronsBalance >= eligibility.cost ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {eligibility.neuronsBalance} / {eligibility.cost}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("winRate")}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {(eligibility.recentWinRatio * 100).toFixed(0)}%
                  </p>
                </div>
              </>
            )}

            {eligibility.isPro && (
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("costLabel")}</p>
                <p
                  className={`text-lg font-bold ${
                    eligibility.freeGameAvailableToday
                      ? "text-emerald-500"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {eligibility.freeGameAvailableToday
                    ? t("freeToday")
                    : t("costPerGame", { cost: eligibility.cost })}
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleCreateGame}
          disabled={creating || cannotAfford}
          className="h-11 w-full rounded-2xl"
        >
          {creating ? t("creating") : t("playButton")}
        </Button>

        {cannotAfford && eligibility && (
          <div className="mt-4">
            <InsufficientNeuronsCta missing={eligibility.cost - eligibility.neuronsBalance} />
          </div>
        )}

        <Link
          href="/"
          className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          {t("backHome")}
        </Link>
      </div>

      <MorpionStatsModal open={showStats} onOpenChange={setShowStats} />
      <MorpionHowToPlayModal
        open={showHowTo}
        onOpenChange={setShowHowTo}
        cost={eligibility?.cost ?? MORPION_COST_PER_GAME}
        isPro={eligibility?.isPro ?? false}
      />
    </div>
  );
}
