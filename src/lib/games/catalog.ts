import type { LucideIcon } from "lucide-react";
import { Brain } from "lucide-react";

export type GameKey = "word-of-day" | "photo-of-day" | "math-target" | "personality-test";

export type GameCatalogEntry = {
  key: GameKey;
  titleKey: string;
  teaserKey: string;
  image?: string;
  icon?: LucideIcon;
};

export const GAMES_CATALOG: GameCatalogEntry[] = [
  { key: "word-of-day", titleKey: "games.wordOfDay.title", teaserKey: "games.wordOfDay.teaser", image: "/images/games/mot-du-jour-bg.webp" },
  { key: "photo-of-day", titleKey: "games.photoOfDay.title", teaserKey: "games.photoOfDay.teaser", image: "/images/games/photo-du-jour-bg.webp" },
  { key: "math-target", titleKey: "games.mathTarget.title", teaserKey: "games.mathTarget.teaser", image: "/images/games/compte-est-bon-bg.webp" },
  { key: "personality-test", titleKey: "games.personalityTest.title", teaserKey: "games.personalityTest.teaser", icon: Brain },
];
