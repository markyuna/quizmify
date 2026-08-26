export type PuzzlePiece = {
  id: number; // row-major index -- also the correct slot for this piece
  row: number;
  col: number;
  backgroundPositionPercent: { x: number; y: number };
  backgroundSizePercent: { width: number; height: number };
};

/**
 * Simple rectangular grid crop -- no tabs/holes (MVP). Swapping this for a
 * real jigsaw shape in v2 only changes what a piece looks like when
 * rendered; `id`/row/col stay the same, so drag-and-drop matching logic and
 * the API/DB (which only ever store gridCols/gridRows) don't need to change.
 */
export function buildPuzzlePieces(cols: number, rows: number): PuzzlePiece[] {
  const pieces: PuzzlePiece[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      pieces.push({
        id: row * cols + col,
        row,
        col,
        backgroundPositionPercent: {
          x: cols === 1 ? 0 : (col / (cols - 1)) * 100,
          y: rows === 1 ? 0 : (row / (rows - 1)) * 100,
        },
        backgroundSizePercent: { width: cols * 100, height: rows * 100 },
      });
    }
  }
  return pieces;
}

/**
 * Fisher-Yates, rerolled once if it produces the already-solved order --
 * good enough for MVP, doesn't need to be adversarially fair.
 */
export function shufflePieceOrder(pieceCount: number): number[] {
  const order = Array.from({ length: pieceCount }, (_, i) => i);
  const isSolved = (arr: number[]) => arr.every((id, i) => id === i);

  do {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (pieceCount > 1 && isSolved(order));

  return order;
}
