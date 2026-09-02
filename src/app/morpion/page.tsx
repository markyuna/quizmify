"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import InsufficientNeuronsCta from "@/components/games/InsufficientNeuronsCta";

type Eligibility = {
  isPro: boolean;
  neuronsBalance: number;
  difficulty: string;
  cost: number;
  recentWinRatio: number;
};

export default function MorpionPage() {
  const router = useRouter();
  const { status } = useSession();
  const t = useTranslations("MorpionPage");
  const { toast } = useToast();
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    const fetchEligibility = async () => {
      try {
        const res = await fetch("/api/morpion/eligibility");
        const data = await res.json();
        setEligibility(data);
      } catch (error) {
        console.error("Error fetching eligibility:", error);
        toast({
          title: "Error",
          description: t("error"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEligibility();
  }, [status, router, t, toast]);

  const handleCreateGame = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/morpion", { method: "POST" });

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
      toast({
        title: "Error",
        description: t("error"),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <div className="mx-auto max-w-md">
        <h1 className="mb-8 text-3xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="mb-6 text-slate-600 dark:text-slate-300">{t("description")}</p>

        {eligibility && (
          <div className="mb-8 space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("difficulty")}</p>
              <p className="text-lg font-bold capitalize text-slate-900 dark:text-white">{eligibility.difficulty}</p>
            </div>

            {!eligibility.isPro && (
              <>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("neuronsBalance")}</p>
                  <p
                    className={`text-lg font-bold ${
                      eligibility.neuronsBalance >= eligibility.cost
                        ? "text-emerald-500"
                        : "text-red-500"
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
          </div>
        )}

        <Button
          onClick={handleCreateGame}
          disabled={creating || (!eligibility?.isPro && (eligibility?.neuronsBalance ?? 0) < (eligibility?.cost ?? 0))}
          className="h-11 w-full rounded-2xl"
        >
          {creating ? t("creating") : t("playButton")}
        </Button>

        {eligibility && !eligibility.isPro && eligibility.neuronsBalance < eligibility.cost && (
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
    </div>
  );
}
