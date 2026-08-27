"use client";

import * as React from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { NEURON_UNLOCK_COSTS } from "@/lib/neurons/costs";
import { resolvePuzzleDuJourAccess } from "@/lib/neurons/access";
import PuzzleDuJourUnlockModal from "@/components/PuzzleDuJourUnlockModal";

type EligibilityResponse = {
  isPro: boolean;
  hasAvailableTicket: boolean;
  neuronsBalance: number;
};

type PuzzleDuJourCarouselItemProps = EligibilityResponse;

/**
 * The one interactive leaf of GameCarousel.tsx (a Server Component) --
 * kept as its own small client island instead of converting the whole
 * carousel, matching that file's own stated goal of keeping the homepage
 * free of client-bundle weight until someone actually interacts with a
 * game card. Initial state comes from the server-resolved props; after a
 * purchase, it re-fetches the same eligibility endpoint itself rather than
 * forcing the whole (server-rendered) page to reload.
 */
export default function PuzzleDuJourCarouselItem(initial: PuzzleDuJourCarouselItemProps) {
  const tPuzzleDuJour = useTranslations("PuzzleDuJour");
  const [eligibility, setEligibility] = React.useState<EligibilityResponse>(initial);
  const [showUnlockModal, setShowUnlockModal] = React.useState(false);

  const access = resolvePuzzleDuJourAccess(eligibility);

  const refetch = React.useCallback(() => {
    return axios
      .get<EligibilityResponse>("/api/puzzle-du-jour/eligibility")
      .then((res) => setEligibility(res.data))
      .catch(() => {});
  }, []);

  const itemClassName =
    "flex items-center gap-3 p-4 font-semibold text-slate-900 transition hover:bg-slate-100 dark:text-white dark:hover:bg-white/10";

  const content = (
    <>
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
        <Image
          src="/images/games/puzzle-du-jour-icon.png"
          alt={tPuzzleDuJour("title")}
          fill
          className="object-cover"
          sizes="32px"
        />
      </div>
      <span className="flex-1 truncate">→ {tPuzzleDuJour("title")}</span>
      {access.kind === "ticket_available" && (
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
          {tPuzzleDuJour("ticketAvailableBadge")}
        </span>
      )}
      {access.kind === "can_purchase" && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
          <Image src="/icono-neurona/neurona-hex-32.png" alt="" width={10} height={10} />
          {tPuzzleDuJour("unlockForCost", { cost: NEURON_UNLOCK_COSTS.puzzleDuJour })}
        </span>
      )}
      {access.kind === "insufficient_balance" && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <Image src="/icono-neurona/neurona-hex-32.png" alt="" width={10} height={10} />
          {tPuzzleDuJour("missingNeurons", { missing: access.missing })}
        </span>
      )}
    </>
  );

  return (
    <li>
      {access.kind === "can_purchase" ? (
        <button
          type="button"
          onClick={() => setShowUnlockModal(true)}
          className={cn(itemClassName, "w-full text-left")}
        >
          {content}
        </button>
      ) : access.kind === "insufficient_balance" ? (
        <div className={cn(itemClassName, "cursor-default")}>{content}</div>
      ) : (
        <Link href="/puzzle-du-jour" className={itemClassName}>
          {content}
        </Link>
      )}

      <PuzzleDuJourUnlockModal
        open={showUnlockModal}
        onOpenChange={setShowUnlockModal}
        neuronsBalance={eligibility.neuronsBalance}
        onUnlocked={refetch}
      />
    </li>
  );
}
