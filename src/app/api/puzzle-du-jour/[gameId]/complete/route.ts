import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { calculateLevel } from "@/lib/xp";
import { PUZZLE_DU_JOUR_XP } from "@/lib/puzzleDuJour";

export async function POST(_req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { gameId } = await params;

  const game = await prisma.puzzleDuJourGame.findUnique({ where: { id: gameId } });
  if (!game || game.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Idempotent: replaying the request (double-submit, retry) never
  // re-awards XP.
  if (game.status === "completed") {
    return NextResponse.json({ success: true, xpEarned: game.xpEarned, alreadyCompleted: true });
  }

  const xpEarned = PUZZLE_DU_JOUR_XP[game.difficulty];

  const newXp = await prisma.$transaction(async (tx) => {
    await tx.puzzleDuJourGame.update({
      where: { id: gameId },
      data: { status: "completed", completedAt: new Date(), xpEarned },
    });

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: xpEarned } },
      select: { xp: true, level: true },
    });

    const newLevel = calculateLevel(updatedUser.xp);
    if (newLevel !== updatedUser.level) {
      await tx.user.update({ where: { id: userId }, data: { level: newLevel } });
    }

    return updatedUser.xp;
  });

  return NextResponse.json({ success: true, xpEarned, totalXp: newXp });
}
