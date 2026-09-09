// Config for the Crucigrama (crossword) game -- mirror of puzzleDuJour.ts.
// Content generation (AI) and grid generation (deterministic backtracker,
// no AI) are two separate steps; see src/lib/crucigrama/generate.ts and
// src/lib/crucigrama/grid.ts.

export type CrucigramaDifficulty = "easy" | "medium" | "hard";

export const CRUCIGRAMA_DIFFICULTIES: CrucigramaDifficulty[] = ["easy", "medium", "hard"];

export function isCrucigramaDifficulty(value: string): value is CrucigramaDifficulty {
  return (CRUCIGRAMA_DIFFICULTIES as string[]).includes(value);
}

// Plain String on NeuronTransaction.gameKey and UserDailyFreeGame.gameKey,
// validated in code -- same stance as AkinatorGame.characterKey.
export const CRUCIGRAMA_GAME_KEY = "crucigrama";

// Inclusive [min, max] word count the AI chooses freely within, per
// difficulty. The grid builder may still drop 1-2 words that refuse to
// interlock, so `min` is the real floor for a valid puzzle.
export const CRUCIGRAMA_WORD_RANGE: Record<CrucigramaDifficulty, readonly [number, number]> = {
  easy: [5, 7],
  medium: [8, 10],
  hard: [11, 13],
};

// Flat XP on completion (every cell correct). Deliberately NOT derived from
// calculateEarnedXpBreakdown -- there is no "correct answers" ratio here,
// finishing the grid is the win. Same stance as PUZZLE_DU_JOUR_XP.
export const CRUCIGRAMA_XP: Record<CrucigramaDifficulty, number> = {
  easy: 20,
  medium: 35,
  hard: 50,
};
