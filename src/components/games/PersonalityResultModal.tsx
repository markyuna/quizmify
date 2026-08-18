"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getCategoryBySlug } from "@/lib/categories";
import { QUEL_ANIMAL_ES_TU_IMAGES, type AnimalKey, type CategorySlug } from "@/lib/personalityTests/quelAnimalEsTu.config";
import { useConfirmPersonalityTest, useRetryPersonalityTest } from "@/hooks/usePersonalityTest";
import ConversionModal from "./ConversionModal";

type PersonalityResultModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultKey: AnimalKey;
  recommendations: CategorySlug[];
  attemptId: string;
  guestId: string | null;
  // Whether this attempt was already claimed at submit time (browser was
  // authenticated) -- decides what "Confirmar" does. See
  // useSubmitPersonalityTest's SubmitPersonalityTestResponse.claimed.
  claimed: boolean;
  onRetried: () => void;
};

/**
 * Shown immediately after the 13th answer, for guest and logged-in visitors
 * alike -- unlike the 3 daily games, this test's result is never gated
 * behind registration. "Confirmar" is what actually fixes the animal for a
 * logged-in visitor (via /confirm); for a guest it opens the same
 * registration flow used elsewhere (ConversionModal), and the existing
 * guest -> account claim does the fixing once they sign up. Closing without
 * choosing (X / click outside) is allowed -- the attempt just stays
 * unconfirmed, recoverable by the parent via the "reopen" prompt it renders
 * in place of this modal.
 */
export default function PersonalityResultModal({
  open,
  onOpenChange,
  resultKey,
  recommendations,
  attemptId,
  guestId,
  claimed,
  onRetried,
}: PersonalityResultModalProps) {
  const t = useTranslations("PersonalityTests.quelAnimalEsTu");
  const tCategories = useTranslations("Categories");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const confirmTest = useConfirmPersonalityTest();
  const retryTest = useRetryPersonalityTest();
  const [confirmed, setConfirmed] = React.useState(false);
  const [showConversionModal, setShowConversionModal] = React.useState(false);

  const animalImage = QUEL_ANIMAL_ES_TU_IMAGES[resultKey];
  const busy = confirmTest.isPending || retryTest.isPending;

  async function handleConfirm() {
    if (!claimed) {
      setShowConversionModal(true);
      return;
    }
    try {
      await confirmTest.mutateAsync({ testKey: "quel_animal_es_tu", attemptId });
      setConfirmed(true);
      queryClient.invalidateQueries({ queryKey: ["personality-animal-status", "quel_animal_es_tu"] });
    } catch {
      toast({
        title: t("resultModal.confirmErrorTitle"),
        description: t("resultModal.confirmError"),
        variant: "destructive",
      });
    }
  }

  async function handleRetry() {
    if (!guestId) return;
    try {
      await retryTest.mutateAsync({ testKey: "quel_animal_es_tu", attemptId, guestId });
      onRetried();
    } catch {
      toast({
        title: t("resultModal.retryErrorTitle"),
        description: t("resultModal.retryError"),
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="relative mx-auto mb-2 h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-lg dark:border-white/20">
              <Image
                src={animalImage}
                alt={t(`animals.${resultKey}.name`)}
                fill
                className="object-cover"
                sizes="112px"
              />
            </div>
            <DialogTitle className="text-center text-xl">
              {confirmed ? t("resultModal.confirmedTitle") : t("yourResult", { animal: t(`animals.${resultKey}.name`) })}
            </DialogTitle>
            <DialogDescription className="text-center">
              {confirmed
                ? t("resultModal.confirmedDescription", { animal: t(`animals.${resultKey}.name`) })
                : t(`animals.${resultKey}.description`)}
            </DialogDescription>
          </DialogHeader>

          {!confirmed && recommendations.length > 0 && (
            <div>
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("resultModal.recommendationsTitle")}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {recommendations.map((slug) => {
                  const category = getCategoryBySlug(slug);
                  return (
                    <span
                      key={slug}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                    >
                      <span>{category?.icon}</span>
                      {tCategories(`${slug}.name`)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {!confirmed && (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleRetry} disabled={busy}>
                {t("retakeCta")}
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={busy}>
                {confirmTest.isPending ? t("resultModal.confirming") : t("resultModal.confirmCta")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConversionModal
        open={showConversionModal}
        onOpenChange={setShowConversionModal}
        namespace="PersonalityTests.quelAnimalEsTu.conversionModal"
      />
    </>
  );
}
