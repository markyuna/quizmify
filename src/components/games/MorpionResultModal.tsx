"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MorpionResult = "won" | "lost" | "draw";

type MorpionResultModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: MorpionResult;
  xpEarned: number;
  hitFreeLimit?: boolean;
  onPlayAgain: () => void;
  onBackHome: () => void;
};

const TONE: Record<MorpionResult, string> = {
  won: "text-emerald-500",
  lost: "text-red-500",
  draw: "text-amber-500",
};

/** Shown when a Morpion game reaches a terminal state -- replaces the old
 * inline result <div> on /morpion/[gameId]. */
export default function MorpionResultModal({
  open,
  onOpenChange,
  result,
  xpEarned,
  hitFreeLimit,
  onPlayAgain,
  onBackHome,
}: MorpionResultModalProps) {
  const t = useTranslations("MorpionGame");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className={cn("text-center text-2xl", TONE[result])}>
            {t(result)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-center">
          {xpEarned > 0 && (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("xpLine", { xp: xpEarned })}
            </p>
          )}
          {hitFreeLimit && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("hitFreeLimit")}</p>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={onPlayAgain} className="w-full">
            {t("playAgain")}
          </Button>
          <Button variant="outline" onClick={onBackHome} className="w-full">
            {t("backHome")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
