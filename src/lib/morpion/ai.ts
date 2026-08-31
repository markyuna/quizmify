import type { Board } from "./logic";
import { checkWinner, getAvailableMoves } from "./logic";

export type MorpionDifficulty = "easy" | "medium" | "hard";

function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  maxDepth: number
): number {
  const winner = checkWinner(board);
  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  if (getAvailableMoves(board).length === 0) return 0;

  if (depth >= maxDepth) return 0; // early cutoff para variar dificultad

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (const move of getAvailableMoves(board)) {
      const newBoard = [...board];
      newBoard[move] = "O";
      const score = minimax(newBoard, depth + 1, false, maxDepth);
      bestScore = Math.max(score, bestScore);
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (const move of getAvailableMoves(board)) {
      const newBoard = [...board];
      newBoard[move] = "X";
      const score = minimax(newBoard, depth + 1, true, maxDepth);
      bestScore = Math.min(score, bestScore);
    }
    return bestScore;
  }
}

export function getComputerMove(
  board: Board,
  difficulty: MorpionDifficulty
): number {
  const availableMoves = getAvailableMoves(board);

  if (availableMoves.length === 0) {
    throw new Error("No available moves");
  }

  if (difficulty === "easy") {
    // 70% random, 30% minimax
    if (Math.random() < 0.7) {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
  } else if (difficulty === "medium") {
    // 30% random, 70% minimax (profundidad reducida)
    if (Math.random() < 0.3) {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
  }

  // hard o default: minimax perfecto
  let bestScore = -Infinity;
  let bestMove = availableMoves[0];

  const maxDepth = difficulty === "medium" ? 5 : 9; // hard = búsqueda completa

  for (const move of availableMoves) {
    const newBoard = [...board];
    newBoard[move] = "O";
    const score = minimax(newBoard, 0, false, maxDepth);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

export function computeDifficulty(
  recentGames: { status: string }[]
): MorpionDifficulty {
  if (recentGames.length < 3) return "medium";

  const score = recentGames.reduce((sum, g) => {
    if (g.status === "won") return sum + 1;
    if (g.status === "draw") return sum + 0.5;
    return sum;
  }, 0);

  const ratio = score / recentGames.length;

  if (ratio >= 0.7) return "hard";
  if (ratio < 0.3) return "easy";
  return "medium";
}
