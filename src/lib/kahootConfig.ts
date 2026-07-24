import { Circle, Diamond, Square, Triangle, type LucideIcon } from "lucide-react";

/** Default per-question countdown when the game doesn't specify one. */
export const KAHOOT_DEFAULT_TIME_PER_QUESTION_SEC = 15;

export const KAHOOT_BASE_POINTS = 500;
export const KAHOOT_MAX_TIME_BONUS = 500;

/** How long the answer reveal stays up before auto-advancing to the next question. */
export const KAHOOT_REVEAL_MS = 2200;

/**
 * Streak bonus multiplier: `1 + min(streakBeforeThisAnswer, cap) * step`.
 * A first correct answer (streak 0 going in) gets no bonus -- it only
 * kicks in from the second consecutive correct answer, same as Kahoot's own
 * streak bonus.
 */
export const KAHOOT_STREAK_MULTIPLIER_STEP = 0.1;
export const KAHOOT_STREAK_MULTIPLIER_CAP = 9;

export type OptionTheme = {
  className: string;
  icon: LucideIcon;
};

// Kahoot's classic four-shape, four-color answer grid.
export const KAHOOT_OPTION_THEMES: OptionTheme[] = [
  { className: "bg-red-500 hover:bg-red-400", icon: Triangle },
  { className: "bg-blue-600 hover:bg-blue-500", icon: Diamond },
  { className: "bg-amber-400 hover:bg-amber-300", icon: Circle },
  { className: "bg-emerald-600 hover:bg-emerald-500", icon: Square },
];
