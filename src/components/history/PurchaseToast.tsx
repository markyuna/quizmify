"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/ui/use-toast";

/**
 * Renders nothing -- it just fires a toast when the Stripe checkout returns
 * to /history?tab=neurons&purchase=success|canceled. Must be wrapped in
 * <Suspense> by the caller (useSearchParams needs a boundary).
 */
export default function PurchaseToast() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const t = useTranslations("NeuronHistory");

  const purchase = searchParams.get("purchase");

  React.useEffect(() => {
    if (purchase === "success") {
      toast({ title: t("purchaseSuccessTitle"), description: t("purchaseSuccessBody") });
    } else if (purchase === "canceled") {
      toast({
        title: t("purchaseCanceledTitle"),
        description: t("purchaseCanceledBody"),
        variant: "destructive",
      });
    }
    // Only react to the param value, not new translator/toast identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase]);

  return null;
}
