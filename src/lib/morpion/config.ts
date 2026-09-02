import type { MorpionGameStatus } from "./logic";

/**
 * Flat XP per terminal outcome. Inline like Akinator's config -- not derived
 * from calculateEarnedXpBreakdown (there's no "correct answers" concept).
 * A loss still pays a little so a rough session isn't pure loss.
 */
export const MORPION_XP: Record<Exclude<MorpionGameStatus, "in_progress">, number> = {
  won: 50,
  draw: 25,
  lost: 10,
};
