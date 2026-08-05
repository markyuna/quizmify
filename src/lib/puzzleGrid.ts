export type PuzzleGridDimensions = { rows: number; cols: number };

/**
 * Picks a close-to-square grid with at least `pieceCount` cells. Quizzes
 * range from 1 to 20 questions, so this never needs to tile exactly --
 * just stay visually balanced (5 -> 3x2, 10 -> 4x3, 20 -> 5x4).
 */
export function getPuzzleGridDimensions(pieceCount: number): PuzzleGridDimensions {
  const cols = Math.max(1, Math.ceil(Math.sqrt(pieceCount)));
  const rows = Math.max(1, Math.ceil(pieceCount / cols));
  return { rows, cols };
}
