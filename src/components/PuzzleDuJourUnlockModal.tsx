"use client";

import * as React from "react";
import axios from "axios";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NEURON_UNLOCK_COSTS } from "@/lib/neurons/costs";

type PuzzleDuJourUnlockModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Balance at the moment the modal opened -- used only to preview
   * "you'll have X left", not re-validated client-side; the real check is
   * the atomic decrement in POST /api/neurons/unlock. */
  neuronsBalance: number;
  /** Called after a confirmed, successful unlock -- the modal only closes
   * itself, refetching eligibility so the UI reflects the new ticket is the
   * caller's job (same "can_purchase" -> "ticket_available" state either
   * surface already re-derives from its own eligibility fetch). */
  onUnlocked: () => void;
};

/**
 * Shared between the two "today's games" list cards (CategorySidebar.tsx,
 * GameCarousel.tsx) and the Puzzle du Jour creation screen
 * (PuzzleDuJourCreation.tsx) -- one component, one POST
 * /api/neurons/unlock call site, instead of three copies of the same
 * confirm-and-handle-errors logic.
 */
export default function PuzzleDuJourUnlockModal({
  open,
  onOpenChange,
  neuronsBalance,
  onUnlocked,
}: PuzzleDuJourUnlockModalProps) {
  const t = useTranslations("PuzzleDuJour");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const cost = NEURON_UNLOCK_COSTS.puzzleDuJour;
  const remaining = Math.max(0, neuronsBalance - cost);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await axios.post("/api/neurons/unlock", { gameKey: "puzzleDuJour" });
      onOpenChange(false);
      onUnlocked();
    } catch (err) {
      const code = axios.isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : null;
      setError(
        code === "INSUFFICIENT_NEURONS"
          ? t("unlockModalErrorInsufficient")
          : code === "PRO_DOES_NOT_NEED_UNLOCK"
            ? t("unlockModalErrorProNotNeeded")
            : t("unlockModalErrorGeneric")
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!submitting) onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/30">
            <Image src="/icono-neurona/neurona-hex-48.png" alt="" width={28} height={28} />
          </div>
          <DialogTitle className="text-center text-xl">{t("unlockModalTitle")}</DialogTitle>
          <DialogDescription className="text-center">{t("unlockModalExplanation")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-center text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("unlockModalConfirmLine", { cost, remaining })}
          </p>

          {error && <p className="text-center text-xs font-medium text-rose-500">{error}</p>}

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-violet-500 to-cyan-500 hover:opacity-90"
            >
              {submitting ? t("unlockModalConfirming") : t("unlockModalConfirmCta")}
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting} className="w-full">
              {t("unlockModalCancelCta")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
