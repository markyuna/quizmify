"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

type Eligibility = {
  isPro: boolean;
  neuronsBalance: number;
  cost: number;
  questionLimit: number;
};

export default function AkinatorPage() {
  const router = useRouter();
  const { status } = useSession();
  const t = useTranslations("AkinatorPage");
  const { toast } = useToast();

  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/akinator/eligibility")
      .then((r) => r.json())
      .then((data) => setEligibility(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, router]);

  const canAfford = eligibility?.isPro || (eligibility?.neuronsBalance ?? 0) >= (eligibility?.cost ?? 0);

  async function handleStart() {
    setCreating(true);
    try {
      const res = await fetch("/api/akinator", { method: "POST" });
      if (res.status === 402) {
        toast({
          title: t("insufficientNeurons"),
          description: t("insufficientNeuronsBody", { cost: eligibility?.cost ?? 50 }),
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) throw new Error("create failed");
      const data = (await res.json()) as { gameId: string };
      router.push(`/akinator/${data.gameId}`);
    } catch (error) {
      console.error("Akinator create failed:", error);
      toast({ title: t("error"), description: t("failedToStart"), variant: "destructive" });
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-violet-600 dark:text-violet-400" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
        </div>
        <p className="mb-6 text-slate-600 dark:text-slate-300">{t("subtitle")}</p>

        <div className="mb-6 space-y-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("howItWorks")}</p>
          <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li>1. {t("step1")}</li>
            <li>2. {t("step2")}</li>
            <li>3. {t("step3")}</li>
          </ul>

          {eligibility && !eligibility.isPro && (
            <div className="flex items-center gap-2 border-t border-slate-200/80 pt-3 dark:border-white/10">
              <Image src="/icono-neurona/neurona-hex-48.png" alt="" width={18} height={18} />
              <span
                className={
                  canAfford
                    ? "text-sm font-bold text-emerald-500"
                    : "text-sm font-bold text-rose-500"
                }
              >
                {eligibility.cost} / {eligibility.neuronsBalance}
              </span>
            </div>
          )}
        </div>

        <Button onClick={handleStart} disabled={creating || !canAfford} className="h-11 w-full rounded-2xl">
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("starting")}
            </>
          ) : (
            t("startGame")
          )}
        </Button>

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
