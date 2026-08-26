import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

export async function GET(_req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;
  const game = await prisma.puzzleDuJourGame.findUnique({ where: { id: gameId } });

  if (!game || game.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // status is returned as-is even when "completed" -- a revisit of this
  // URL renders a read-only view instead of a fresh, replayable board.
  return NextResponse.json({
    topic: game.topic,
    difficulty: game.difficulty,
    gridCols: game.gridCols,
    gridRows: game.gridRows,
    imageUrl: game.imageUrl,
    status: game.status,
    xpEarned: game.xpEarned,
  });
}
