export type PuzzleDuJourDifficulty = "easy" | "medium" | "hard";

/** Up to this many PuzzleDuJourGame rows per user per UTC day -- a topic
 * rejected by moderation never gets a row, so it doesn't count against
 * this (see puzzleDuJourImage.ts and POST /api/puzzle-du-jour). */
export const PUZZLE_DU_JOUR_DAILY_LIMIT = 2;

// Fixed pick within each range from the product spec (3x3-5x5 / 6x6-8x8 /
// 9x9-10x10) -- not randomized within the range, for MVP simplicity.
export const PUZZLE_DU_JOUR_GRID: Record<PuzzleDuJourDifficulty, { cols: number; rows: number }> = {
  easy: { cols: 4, rows: 4 },
  medium: { cols: 7, rows: 7 },
  hard: { cols: 10, rows: 10 },
};

// Harder grid = more pieces = more XP. Flat, not derived from
// calculateEarnedXpBreakdown -- there's no "correct answers" concept here,
// completing the puzzle at all is the win.
export const PUZZLE_DU_JOUR_XP: Record<PuzzleDuJourDifficulty, number> = {
  easy: 20,
  medium: 35,
  hard: 50,
};

// Deliberately not imported from guestPlay.ts -- Puzzle du Jour stays
// isolated from the guest-game system it has nothing else in common with.
export function getTodayDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
