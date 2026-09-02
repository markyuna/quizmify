"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Play, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import NeuronsPurchaseModal from "@/components/NeuronsPurchaseModal";

type InsufficientNeuronsCtaProps = {
  /** How many Neurons short the player is. */
  missing: number;
  className?: string;
};

/**
 * Shown on a Neuron-gated game screen (akinator, morpion, puzzle du jour)
 * when the player can't afford to play: a short message plus two actions --
 * earn Neurons by playing quizzes (/categories), or buy them now (opens
 * NeuronsPurchaseModal). Theme-neutral card so it drops cleanly into both
 * the Tailwind screens and the akinator hero.
 */
export default function InsufficientNeuronsCta({ missing, className }: InsufficientNeuronsCtaProps) {
  const t = useTranslations("NeuronsCta");
  const router = useRouter();
  const [showPurchase, setShowPurchase] = React.useState(false);

  return (
    <div
      className={
        "rounded-2xl border border-slate-200 bg-white/70 p-4 text-center dark:border-white/10 dark:bg-white/5 " +
        (className ?? "")
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{t("message", { missing })}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/categories")}
          aria-label={t("earnAriaLabel")}
        >
          <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t("earnByPlaying")}
        </Button>
        <Button
          type="button"
          onClick={() => setShowPurchase(true)}
          aria-label={t("buyAriaLabel")}
          className="bg-violet-600 text-white hover:bg-violet-700"
        >
          <ShoppingCart className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t("buyNow")}
        </Button>
      </div>

      <NeuronsPurchaseModal open={showPurchase} onOpenChange={setShowPurchase} />
    </div>
  );
}
