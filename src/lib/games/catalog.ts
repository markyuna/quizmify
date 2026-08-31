import type { LucideIcon } from "lucide-react";

import { ALL_GAMES } from "./allGames";

export type GameKey = "word-of-day" | "photo-of-day" | "math-target";

export type GameCatalogEntry = {
  key: GameKey;
  titleKey: string;
  teaserKey: string;
  image?: string;
  icon?: LucideIcon;
};

/**
 * The 3 free guest mini-games, derived from ALL_GAMES (the single source of
 * truth -- see allGames.ts). Kept as its own export with the flatter
 * `titleKey`/`teaserKey` shape for the callers that only deal with guest
 * games: the /games play page and the guest-play plumbing. `titleKey` /
 * `teaserKey` are relative to the "GuestGames" next-intl namespace.
 */
export const GAMES_CATALOG: GameCatalogEntry[] = ALL_GAMES.filter(
  (game) => game.kind === "guest"
).map((game) => ({
  key: game.key as GameKey,
  titleKey: game.i18nKey,
  // Guest entries always carry a description key.
  teaserKey: game.descriptionKey ?? game.i18nKey,
  image: game.image,
  icon: game.icon,
}));
