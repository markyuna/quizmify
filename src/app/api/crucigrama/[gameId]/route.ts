import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { toClientCrossword, type CrosswordLayout } from "@/lib/crucigrama/grid";

type Params = { params: Promise<{ gameId: string }> };

/**
 * Load one game for the play page / a refresh. The grid shape and the clues
 * go to the client; the solution letters and the answers never leave the
 * server (grading is done in [gameId]/submit).
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;
  const game = await prisma.crucigramaGame.findFirst({
    where: { id: gameId, userId: session.user.id },
  });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: game.id,
    topic: game.topic,
    difficulty: game.difficulty,
    status: game.status,
    xpEarned: game.xpEarned,
    score: game.score,
    wordCount: game.wordCount,
    puzzle: toClientCrossword(JSON.parse(game.layout) as CrosswordLayout),
  });
}
