import type { LucideIcon } from "lucide-react";

import {
  AKINATOR_COST_PER_GAME,
  CRUCIGRAMA_COST_PER_GAME,
  MORPION_COST_PER_GAME,
  NEURON_UNLOCK_COSTS,
  PEINTRE_COST_PER_GAME,
} from "@/lib/neurons/costs";

/**
 * Single source of truth for the full games catalogue -- every game the app
 * surfaces in a "list of games" (the /categories sidebar, the homepage
 * carousel, the per-category sidebar, and the header nav dropdown). Add a
 * game here once and it shows up in all four places.
 *
 * The 3 free guest mini-games are the `kind: "guest"` subset; `catalog.ts`
 * re-exports exactly those as GAMES_CATALOG for the callers that only care
 * about the guest games (the /games play page, the guest-play plumbing).
 *
 * Titles are stored as an (i18nNamespace, i18nKey) pair rather than a
 * pre-resolved string so this stays a plain data module usable from both
 * Server and Client Components -- GameCard resolves them with a root
 * `useTranslations()` translator.
 */

export type GameKind =
  // Free, no login -- played inline at /games?game=<key>.
  | "guest"
  // Auth + (Pro or a Neuron spend). Puzzle du Jour (unlock ticket) and
  // Morpion (per-game debit) -- their real access UI is client-side, see
  // PuzzleDuJourGameCard.
  | "pro-neuron"
  // A hand-curated quiz. Was launched through the normal /quiz flow;
  // "Qui est le peintre?" has since become its own standalone game
  // (kind "pro-neuron", /peintre) so nothing uses this today -- kept for
  // the next curated set.
  | "curated";

export type AllGamesEntry = {
  /** Stable id. For `kind: "guest"` this is the GameKey used in the URL. */
  key: string;
  kind: GameKind;
  href: string;
  /** next-intl namespace + key for the display title. */
  i18nNamespace: string;
  i18nKey: string;
  /**
   * next-intl key (same namespace as the title) for a short teaser/
   * description. Guest games always have one; the others don't yet.
   */
  descriptionKey?: string;
  /** Hero/background or icon image for the card's image slot. */
  image?: string;
  /** Lucide icon fallback when there is no `image`. */
  icon?: LucideIcon;
  /**
   * Neuron price shown as a badge for `kind: "pro-neuron"`. Morpion is a
   * per-game debit; Puzzle du Jour is a one-off unlock ticket (its full
   * gating UI lives in PuzzleDuJourGameCard).
   */
  neuronCost?: number;
  /** Show a "Pro" badge to non-Pro users (Puzzle du Jour). */
  showProBadge?: boolean;
};

export const ALL_GAMES: AllGamesEntry[] = [
  {
    key: "word-of-day",
    kind: "guest",
    href: "/games?game=word-of-day",
    i18nNamespace: "GuestGames",
    i18nKey: "games.wordOfDay.title",
    descriptionKey: "games.wordOfDay.teaser",
    image: "/images/games/mot-du-jour-bg.png",
  },
  {
    key: "photo-of-day",
    kind: "guest",
    href: "/games?game=photo-of-day",
    i18nNamespace: "GuestGames",
    i18nKey: "games.photoOfDay.title",
    descriptionKey: "games.photoOfDay.teaser",
    image: "/images/games/photo-du-jour-bg.png",
  },
  {
    key: "math-target",
    kind: "guest",
    href: "/games?game=math-target",
    i18nNamespace: "GuestGames",
    i18nKey: "games.mathTarget.title",
    descriptionKey: "games.mathTarget.teaser",
    image: "/images/games/compte-est-bon-bg.png",
  },
  {
    key: "qui-est-le-peintre",
    kind: "pro-neuron",
    href: "/peintre",
    i18nNamespace: "Peintre",
    i18nKey: "title",
    image: "/images/games/peintre-icon.png",
    neuronCost: PEINTRE_COST_PER_GAME,
  },
  {
    key: "puzzle-du-jour",
    kind: "pro-neuron",
    href: "/puzzle-du-jour",
    i18nNamespace: "PuzzleDuJour",
    i18nKey: "title",
    image: "/images/games/puzzle-du-jour-icon.png",
    neuronCost: NEURON_UNLOCK_COSTS.puzzleDuJour,
  },
  {
    key: "morpion",
    kind: "pro-neuron",
    href: "/morpion",
    i18nNamespace: "MorpionPage",
    i18nKey: "title",
    image: "/images/games/morpion-icon.png",
    neuronCost: MORPION_COST_PER_GAME,
  },
  {
    key: "akinator",
    kind: "pro-neuron",
    href: "/akinator",
    i18nNamespace: "AkinatorPage",
    i18nKey: "title",
    image: "/images/games/akinator-icon.png",
    neuronCost: AKINATOR_COST_PER_GAME,
  },
  {
    key: "crucigrama",
    kind: "pro-neuron",
    href: "/crucigrama",
    i18nNamespace: "CrucigramaPage",
    i18nKey: "title",
    image: "/images/games/crucigrama-icon.png",
    neuronCost: CRUCIGRAMA_COST_PER_GAME,
  },
];

export function getGameByKey(key: string): AllGamesEntry | undefined {
  return ALL_GAMES.find((game) => game.key === key);
}
