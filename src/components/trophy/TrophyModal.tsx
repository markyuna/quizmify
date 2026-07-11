"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import Trophy3D from "./Trophy3D";
import type { TrophyReason } from "@/app/api/quiz/submit/route";

type TrophyModalProps = {
  reason: Exclude<TrophyReason, null>;
  streakCount?: number;
  onClose: () => void;
  autoDismissMs?: number;
};

export default function TrophyModal({
  reason,
  streakCount,
  onClose,
  autoDismissMs = 6000,
}: TrophyModalProps) {
  const t = useTranslations("Trophy");

  React.useEffect(() => {
    if (!autoDismissMs) return;
    const timeout = window.setTimeout(onClose, autoDismissMs);
    return () => window.clearTimeout(timeout);
  }, [autoDismissMs, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 w-full max-w-sm rounded-[2rem] border border-amber-300/30 bg-white/95 p-6 text-center shadow-[0_30px_80px_-20px_rgba(251,191,36,0.5)] backdrop-blur-2xl dark:border-amber-500/20 dark:bg-slate-950/95"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <Trophy3D reason={reason} />

        <p className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-amber-500 dark:text-amber-300">
          {reason === "perfect" ? t("perfectBadge") : t("streakBadge")}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {reason === "perfect" ? t("perfectTitle") : t("streakTitle")}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {reason === "perfect"
            ? t("perfectSubtitle")
            : t("streakSubtitle", { count: streakCount ?? 0 })}
        </p>
      </motion.div>
    </motion.div>
  );
}
