import type { Difficulty } from "@/lib/questionGeneration";

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

/**
 * Below this many questions there isn't enough room to meaningfully split
 * into "first batch at the chosen difficulty, second batch adjusted" --
 * short quizzes are generated upfront as a single batch, unchanged from
 * before this feature existed.
 */
export const MIN_QUESTIONS_FOR_ADAPTIVE_DIFFICULTY = 4;

/** First batch gets the larger half for odd counts, so the adaptive second batch is never bigger than the baseline the adjustment is reacting to. */
export function splitIntoBatches(totalAmount: number): { firstBatch: number; secondBatch: number } {
  const firstBatch = Math.ceil(totalAmount / 2);
  return { firstBatch, secondBatch: totalAmount - firstBatch };
}

/**
 * Bumps difficulty up a notch after a strong first batch (>=75% correct),
 * down a notch after a weak one (<=25%), otherwise holds steady.
 * Deliberately coarse -- three discrete levels, one adjustment step -- this
 * is a within-quiz nudge, not a precision-tuned IRT model, and it only ever
 * runs once per quiz (there are only two batches).
 */
export function adjustDifficulty(
  current: Difficulty,
  correctCount: number,
  totalAnswered: number
): Difficulty {
  if (totalAnswered === 0) return current;

  const accuracy = correctCount / totalAnswered;
  const index = DIFFICULTY_ORDER.indexOf(current);

  if (accuracy >= 0.75 && index < DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[index + 1];
  }
  if (accuracy <= 0.25 && index > 0) {
    return DIFFICULTY_ORDER[index - 1];
  }
  return current;
}
