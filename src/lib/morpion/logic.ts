export type Board = (string | null)[];
export type Cell = string | null;
export type Player = "X" | "O";
export type MorpionGameStatus = "in_progress" | "won" | "lost" | "draw";

export function createEmptyBoard(): Board {
  return Array(9).fill(null);
}

export function checkWinner(board: Board): Player | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  return null;
}

export function checkDraw(board: Board): boolean {
  return board.every((cell) => cell !== null) && !checkWinner(board);
}

export function getAvailableMoves(board: Board): number[] {
  return board
    .map((cell, idx) => (cell === null ? idx : null))
    .filter((idx) => idx !== null) as number[];
}

export function applyMove(board: Board, position: number, player: Player): Board {
  if (board[position] !== null) {
    throw new Error("Cell already occupied");
  }
  const newBoard = [...board];
  newBoard[position] = player;
  return newBoard;
}
