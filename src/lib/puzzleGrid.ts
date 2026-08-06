export type PuzzleGridDimensions = { rows: number; cols: number };

/**
 * Picks a close-to-square grid with at least `pieceCount` cells (5 -> 3x2,
 * 10 -> 4x3, 20 -> 5x4).
 *
 * Deliberately not an exact tiling: forcing rows*cols === pieceCount would
 * turn every prime count into a one-row strip, and 5 -- the default quiz
 * length -- is prime. Staying near-square costs a few leftover cells
 * instead, so callers must paint all rows*cols cells and decide what the
 * leftovers beyond `pieceCount` look like; drawing only `pieceCount` of
 * them leaves visible holes in the image.
 */
export function getPuzzleGridDimensions(pieceCount: number): PuzzleGridDimensions {
  const cols = Math.max(1, Math.ceil(Math.sqrt(pieceCount)));
  const rows = Math.max(1, Math.ceil(pieceCount / cols));
  return { rows, cols };
}
