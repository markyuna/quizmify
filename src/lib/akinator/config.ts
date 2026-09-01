// Hard cap on questions per game -- also the OpenAI cost ceiling (each
// /question call replays the full transcript).
export const MAX_QUESTIONS = 20;

// Flat XP for a correct guess. Deliberately inline like Morpion's win XP
// (see /api/morpion/[gameId]/move) -- not derived from calculateEarnedXp.
export const AKINATOR_WIN_XP = 15;
