"use client";

import * as React from "react";
import axios from "axios";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { AllGamesEntry } from "@/lib/games/allGames";
import { resolvePuzzleDuJourAccess } from "@/lib/neurons/access";
import PuzzleDuJourUnlockModal from "@/components/PuzzleDuJourUnlockModal";
import {
  GRID_CARD_CLASS,
  GRID_CARD_HOVER_CLASS,
  GameCardBadge,
  GameCardGridBody,
  NeuronCostBadge,
} from "./GameCard";

/**
 * The client island for Puzzle du Jour's grid card -- the one game whose
 * card needs an interactive access flow (unlock modal) rather than a plain
 * link. Used by the three grid surfaces (GamesSidebarSection, CategorySidebar,
 * GameCarousel) in place of <GameCard variant="grid"> for this entry. The
 * header nav keeps a plain <GameCard>: it never had the unlock flow.
 *
 * Initial state comes from the server-resolved `initialIsPro` where the
 * caller has it; the rest (ticket, balance) is fetched on mount and
 * re-fetched after a successful unlock.
 */

type Eligibility = { isPro: boolean; hasAvailableTicket: boolean; neuronsBalance: number };

type PuzzleDuJourGameCardProps = {
  game: AllGamesEntry;
  initialIsPro?: boolean;
};

export default function PuzzleDuJourGameCard({ game, initialIsPro = false }: PuzzleDuJourGameCardProps) {
  const t = useTranslations();
  const tPuzzle = useTranslations("PuzzleDuJour");

  const [eligibility, setEligibility] = React.useState<Eligibility>({
    isPro: initialIsPro,
    hasAvailableTicket: false,
    neuronsBalance: 0,
  });
  const [showUnlockModal, setShowUnlockModal] = React.useState(false);

  const refetch = React.useCallback(
    () =>
      axios
        .get<Eligibility>("/api/puzzle-du-jour/eligibility")
        .then((res) => setEligibility(res.data))
        .catch(() => {}),
    []
  );

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const access = resolvePuzzleDuJourAccess(eligibility);
  const title = t(`${game.i18nNamespace}.${game.i18nKey}`);

  let badge: React.ReactNode = null;
  if (access.kind === "ticket_available") {
    badge = (
      <GameCardBadge variant="grid" tone="pro">
        {tPuzzle("ticketAvailableBadge")}
      </GameCardBadge>
    );
  } else if (access.kind === "can_purchase") {
    badge = (
      <NeuronCostBadge variant="grid">
        {tPuzzle("unlockForCost", { cost: game.neuronCost ?? 0 })}
      </NeuronCostBadge>
    );
  } else if (access.kind === "insufficient_balance") {
    badge = (
      <NeuronCostBadge variant="grid">
        {t("MorpionPage.costPerGame", { cost: game.neuronCost ?? 0 })}
      </NeuronCostBadge>
    );
  }

  const body = <GameCardGridBody game={game} title={title} badge={badge} />;

  if (access.kind === "can_purchase") {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowUnlockModal(true)}
          className={cn(GRID_CARD_CLASS, GRID_CARD_HOVER_CLASS, "w-full")}
        >
          {body}
        </button>
        <PuzzleDuJourUnlockModal
          open={showUnlockModal}
          onOpenChange={setShowUnlockModal}
          neuronsBalance={eligibility.neuronsBalance}
          onUnlocked={refetch}
        />
      </>
    );
  }

  if (access.kind === "insufficient_balance") {
    // Link through to the creation screen, which shows the earn/buy CTA
    // (InsufficientNeuronsCta) -- same landing as akinator/morpion.
    return (
      <Link href={game.href} className={cn(GRID_CARD_CLASS, GRID_CARD_HOVER_CLASS)}>
        {body}
      </Link>
    );
  }

  // "pro" or "ticket_available" -- a plain link into the game.
  return (
    <Link href={game.href} className={cn(GRID_CARD_CLASS, GRID_CARD_HOVER_CLASS)}>
      {body}
    </Link>
  );
}
