import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const TERMINAL = ["won", "lost", "draw"] as const;

/**
 * GET /api/morpion/stats -- the current user's Morpion record plus a global
 * benchmark. All computed on the fly from MorpionGame (no aggregate table);
 * the [userId, status] / [userId, createdAt] indexes cover these queries.
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const [total, won, lastGames, globalTotal, globalWon] = await Promise.all([
      prisma.morpionGame.count({ where: { userId, status: { in: [...TERMINAL] } } }),
      prisma.morpionGame.count({ where: { userId, status: "won" } }),
      prisma.morpionGame.findMany({
        where: { userId, status: { in: [...TERMINAL] } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, status: true, difficulty: true, createdAt: true },
      }),
      prisma.morpionGame.count({ where: { status: { in: [...TERMINAL] } } }),
      prisma.morpionGame.count({ where: { status: "won" } }),
    ]);

    return NextResponse.json(
      {
        total,
        winRate: total > 0 ? won / total : 0,
        avgWinRate: globalTotal > 0 ? globalWon / globalTotal : 0,
        lastGames,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Morpion stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
