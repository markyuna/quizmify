"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

type LevelUpPaywallModalProps = {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

export default function LevelUpPaywallModal({
  open,
  onClose,
  onUpgrade,
}: LevelUpPaywallModalProps) {
  const t = useTranslations("LevelUpPaywall");

  useEffect(() => {
    if (open) {
      trackEvent("paywall_modal_shown", {
        nextLevel: 3,
        source: "level_up_attempt",
      });
    }
  }, [open]);

  const handleUpgrade = () => {
    trackEvent("upgrade_clicked", {
      source: "level_3_paywall",
      nextLevel: 3,
    });
    onUpgrade();
  };

  const handleClose = () => {
    trackEvent("paywall_modal_dismissed", {
      nextLevel: 3,
      action: "close_button",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="relative">
          <button
            onClick={handleClose}
            className="absolute right-0 top-0 p-1 hover:opacity-70"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          <p className="text-base text-slate-600 dark:text-slate-400">
            {t("description")}
          </p>

          {/* Features */}
          <div className="space-y-3 rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 p-4 dark:from-violet-950/30 dark:to-purple-950/30">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {t("proFeatures")}
            </h3>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500">
                  <span className="text-xs text-white">✓</span>
                </span>
                {t("feature1")}
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500">
                  <span className="text-xs text-white">✓</span>
                </span>
                {t("feature2")}
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500">
                  <span className="text-xs text-white">✓</span>
                </span>
                {t("feature3")}
              </li>
            </ul>
          </div>

          {/* Price badge */}
          <div className="rounded-lg border-2 border-violet-500/30 bg-white/50 p-3 text-center dark:bg-white/5">
            <p className="text-2xl font-black text-violet-600 dark:text-violet-400">
              {t("price")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("oneTimePayment")}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              onClick={handleUpgrade}
            >
              <Link href="/upgrade">{t("upgradeButton")}</Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleClose}
            >
              {t("declineButton")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
