import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ gameId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;

  try {
    const game = await prisma.morpionGame.findFirst({
      where: {
        id: gameId,
        userId: session.user.id,
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json({
      gameId: game.id,
      board: JSON.parse(game.board),
      status: game.status,
      difficulty: game.difficulty,
      xpEarned: game.xpEarned,
      playerSymbol: game.playerSymbol,
    });
  } catch (error) {
    console.error("Get game error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
