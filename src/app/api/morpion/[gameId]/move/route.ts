import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { calculateLevel } from "@/lib/xp";
import { FREE_XP_CAP, FREE_LEVEL_CAP } from "@/lib/stripe";
import { morpionMoveSchema } from "@/schemas/form/morpion";
import { checkWinner, checkDraw, applyMove } from "@/lib/morpion/logic";
import { getComputerMove } from "@/lib/morpion/ai";
import { MORPION_XP } from "@/lib/morpion/config";
import type { Board, MorpionGameStatus } from "@/lib/morpion/logic";

type Params = { params: Promise<{ gameId: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;

  try {
    const body = await request.json();
    const parsed = morpionMoveSchema.safeParse({ gameId, ...body });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid move" }, { status: 400 });
    }

    const { position } = parsed.data;

    const game = await prisma.morpionGame.findFirst({
      where: {
        id: gameId,
        userId: session.user.id,
      },
    });

    if (!game || game.status !== "in_progress") {
      return NextResponse.json({ error: "Invalid game state" }, { status: 400 });
    }

    let board: Board = JSON.parse(game.board);

    // Validar que la celda está vacía
    if (board[position] !== null) {
      return NextResponse.json({ error: "Cell occupied" }, { status: 400 });
    }

    // Aplicar movimiento del usuario (X)
    board = applyMove(board, position, "X");

    let status: MorpionGameStatus = "in_progress";

    // Revisar si el usuario ganó
    if (checkWinner(board) === "X") {
      status = "won";
    } else if (checkDraw(board)) {
      status = "draw";
    }

    // Si el juego sigue, la IA juega (O)
    if (status === "in_progress") {
      const aiMove = getComputerMove(board, game.difficulty);
      board = applyMove(board, aiMove, "O");

      // Revisar si la IA ganó
      if (checkWinner(board) === "O") {
        status = "lost";
      } else if (checkDraw(board)) {
        status = "draw";
      }
    }

    // XP ponderado por resultado: win 50 / draw 25 / loss 10.
    const xpEarned = status === "in_progress" ? 0 : MORPION_XP[status];

    const result = await prisma.$transaction(async (tx) => {
      // Apply the move only while the row is still in_progress. updateMany
      // (not update) puts that guard in the WHERE clause, so two concurrent
      // requests for the same move can't both land: the first flips the
      // row, the second matches nothing (count === 0). This is what stops a
      // double-submitted closing move from crediting XP twice -- and also
      // stops a stale intermediate move from writing over (resurrecting) an
      // already-finished game. Same guard as the akinator guess route.
      const applied = await tx.morpionGame.updateMany({
        where: { id: gameId, status: "in_progress" },
        data: {
          board: JSON.stringify(board),
          status,
          xpEarned,
          completedAt: status !== "in_progress" ? new Date() : null,
        },
      });

      if (applied.count === 0) {
        // A concurrent request already advanced this game. Credit nothing;
        // return the authoritative persisted state so the client still
        // renders the real board/result -- the locally computed board can
        // differ, since the AI reply is randomised on easy/medium.
        const persisted = await tx.morpionGame.findUniqueOrThrow({
          where: { id: gameId },
          select: { board: true, status: true, xpEarned: true },
        });
        return {
          board: JSON.parse(persisted.board) as Board,
          status: persisted.status as MorpionGameStatus,
          xpEarned: persisted.xpEarned,
          hitFreeLimit: false,
        };
      }

      let hitFreeLimit = false;

      if (xpEarned > 0) {
        const previousUser = await tx.user.findUniqueOrThrow({
          where: { id: session.user.id },
          select: { level: true, subscriptionStatus: true, premiumUntil: true },
        });
        const isPro = isEffectivelyPro(previousUser);

        // xp always keeps accumulating -- it's the permanent record of
        // everything the user has earned. Only the *level* is capped for
        // free users, same invariant as /api/quiz/submit -- never clamp xp
        // itself, or progress from a Pro window is lost forever on lapse.
        const updatedUser = await tx.user.update({
          where: { id: session.user.id },
          data: { xp: { increment: xpEarned } },
          select: { xp: true },
        });

        const newXp = updatedUser.xp;
        const trueLevel = calculateLevel(newXp);
        hitFreeLimit = !isPro && newXp >= FREE_XP_CAP;
        const newLevel = isPro ? trueLevel : Math.min(trueLevel, FREE_LEVEL_CAP);

        if (newLevel !== previousUser.level) {
          await tx.user.update({
            where: { id: session.user.id },
            data: { level: newLevel },
          });
        }
      }

      return { board, status, xpEarned, hitFreeLimit };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Move error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
