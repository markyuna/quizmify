"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PawPrint, ArrowRight } from "lucide-react";

import { useDismissMascotNudge } from "@/hooks/usePersonalityTest";

const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
// First use of localStorage in the project (everywhere else uses
// sessionStorage, e.g. GuestRoundClaim.tsx's claim-attempted flag) --
// intentional exception: sessionStorage doesn't survive closing the tab,
// which is exactly what a 7-day dismiss cooldown needs to survive.
const GUEST_DISMISS_STORAGE_KEY = "quizmify_mascot_nudge_dismissed_at";

type MascotDiscoveryNudgeProps = {
  isAuthenticated: boolean;
  hasMascot: boolean;
  /** ISO date string from User.lastMascotNudgeDismissedAt -- ignored for
   * guests, who read/write localStorage instead (no User row yet). */
  lastDismissedAt: string | null;
};

/**
 * Compact nudge for the 3 daily-game result screens, suggesting the "quel
 * animal es-tu" test -- same visual language as PersonalityMascotCard.tsx's
 * empty state, shrunk for an inline slot. isAuthenticated/hasMascot are
 * resolved by the caller (usePersonalityAnimalStatus) and passed in; this
 * component only owns the dismiss-cooldown bookkeeping itself.
 */
export default function MascotDiscoveryNudge({ isAuthenticated, hasMascot, lastDismissedAt }: MascotDiscoveryNudgeProps) {
  const t = useTranslations("MascotDiscoveryNudge");
  const dismissMutation = useDismissMascotNudge();

  // Starts hidden and is only ever flipped true from the effect below --
  // avoids ever reading the clock (or localStorage, guest-only) during
  // render, which React (and the react-hooks/purity lint rule) requires to
  // stay pure. Also means SSR/first paint never flashes the nudge before
  // the cooldown has actually been checked.
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (hasMascot) {
      setVisible(false);
      return;
    }

    let dismissedAtMs: number | null = null;
    if (isAuthenticated) {
      dismissedAtMs = lastDismissedAt ? new Date(lastDismissedAt).getTime() : null;
    } else {
      try {
        const raw = localStorage.getItem(GUEST_DISMISS_STORAGE_KEY);
        dismissedAtMs = raw ? Number(raw) : null;
      } catch {
        // Private mode / storage blocked -- fall back to showing it.
        dismissedAtMs = null;
      }
    }

    const inCooldown = dismissedAtMs !== null && Date.now() - dismissedAtMs < DISMISS_COOLDOWN_MS;
    setVisible(!inCooldown);
  }, [isAuthenticated, hasMascot, lastDismissedAt]);

  if (!visible) return null;

  function handleDismiss() {
    setVisible(false);
    if (isAuthenticated) {
      dismissMutation.mutate();
    } else {
      try {
        localStorage.setItem(GUEST_DISMISS_STORAGE_KEY, String(Date.now()));
      } catch {
        // Best-effort -- worst case the nudge reappears next visit.
      }
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-pink-200/60 bg-pink-50/60 px-3 py-2.5 dark:border-pink-500/20 dark:bg-pink-500/10">
      <PawPrint className="h-4 w-4 shrink-0 text-pink-500" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{t("title")}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("description")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/quel-animal-es-tu"
          className="inline-flex items-center gap-1 rounded-full bg-pink-500 px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90"
        >
          {t("ctaLabel")}
          <ArrowRight className="h-3 w-3" />
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[11px] font-medium text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-200"
        >
          {t("dismissLabel")}
        </button>
      </div>
    </div>
  );
}
