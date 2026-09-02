"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import NeuronsShop from "@/components/shop/NeuronsShop";

type NeuronsPurchaseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Dialog wrapper around <NeuronsShop /> so any surface can offer a "buy
 * Neurons" flow without a full-page navigation. All of the checkout logic
 * (POST /api/checkout/neurons -> Stripe Checkout redirect) lives in
 * NeuronsShop; this only frames it. Used by InsufficientNeuronsCta.
 */
export default function NeuronsPurchaseModal({ open, onOpenChange }: NeuronsPurchaseModalProps) {
  const t = useTranslations("NeuronsShop");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        <NeuronsShop showHeading={false} />
      </DialogContent>
    </Dialog>
  );
}
