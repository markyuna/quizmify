"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MORPION_XP } from "@/lib/morpion/config";

type MorpionHowToPlayModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Live cost from /api/morpion/eligibility; parent passes a fallback so
   * this never renders "undefined" if the modal opens before the fetch. */
  cost: number;
  /** Pro players pay nothing per game, so the Cost section is hidden for
   * them entirely -- same treatment as the balance/cost block on /morpion. */
  isPro: boolean;
};

/** Explains what isn't obvious about Morpion -- Neuron cost, what changes
 * between difficulties, XP per result. Triggered from a "?" button on
 * /morpion, before the player spends Neurons. Same Dialog pattern as
 * MorpionStatsModal (controlled open/onOpenChange, no DialogTrigger). */
export default function MorpionHowToPlayModal({
  open,
  onOpenChange,
  cost,
  isPro,
}: MorpionHowToPlayModalProps) {
  const t = useTranslations("MorpionHowToPlay");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {!isPro && (
            <section className="space-y-1">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t("costTitle")}
              </h3>
              <p>{t("costBody", { cost })}</p>
            </section>
          )}

          <section className="space-y-1">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {t("difficultyTitle")}
            </h3>
            <ul className="space-y-1">
              <li>{t("difficultyEasy")}</li>
              <li>{t("difficultyMedium")}</li>
              <li>{t("difficultyHard")}</li>
            </ul>
          </section>

          <section className="space-y-1">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {t("xpTitle")}
            </h3>
            <p>
              {t("xpBody", {
                win: MORPION_XP.won,
                draw: MORPION_XP.draw,
                loss: MORPION_XP.lost,
              })}
            </p>
          </section>
        </div>

        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="w-full"
        >
          {t("close")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
