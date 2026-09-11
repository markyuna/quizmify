// Config for the standalone "Qui est le peintre?" painter game. Content
// (the decks) lives in src/lib/peintre/decks.ts -- no AI, no generation.
// Migrated from the curated-quiz path (src/lib/curatedQuizzes/
// quiEstLePeintre.ts, kept on disk for reference).

// Plain String on NeuronTransaction.gameKey and UserDailyFreeGame.gameKey,
// validated in code -- same stance as CRUCIGRAMA_GAME_KEY.
export const PEINTRE_GAME_KEY = "peintre";

// Every deck is exactly this many questions.
export const PEINTRE_QUESTION_COUNT = 10;

// Flat XP on completion (10 questions answered). Deliberately NOT derived
// from calculateEarnedXpBreakdown -- there is no completion/correctness
// ratio here, finishing the deck is the reward. Same stance as
// CRUCIGRAMA_XP / PUZZLE_DU_JOUR_XP.
export const PEINTRE_XP_BASE = 10;

// Extra flat XP when the player gets all 10 right. Total possible: 20.
export const PEINTRE_XP_PERFECT_BONUS = 10;

export type PeintreStatus = "in_progress" | "completed";

export function isPeintreStatus(value: string): value is PeintreStatus {
  return value === "in_progress" || value === "completed";
}
