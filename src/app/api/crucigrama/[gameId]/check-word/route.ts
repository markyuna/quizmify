import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { crucigramaCheckWordSchema } from "@/schemas/form/crucigrama";
import { isEntryCorrect, type CrosswordLayout } from "@/lib/crucigrama/grid";

type Params = { params: Promise<{ gameId: string }> };

/**
 * Grade ONE word, for the board's real-time per-word feedback. Compares
 * against layout.entries server-side exactly like [gameId]/submit and
 * returns a boolean only -- the solution letters never leave the server.
 * Nothing is persisted; XP is still credited solely by /submit on a full
 * solve. No attempt cap -- same stance as the rest of the single-player
 * games (no leaderboard, and XP still needs the whole grid solved).
 */
export async function POST(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { gameId } = await params;

  const parsed = crucigramaCheckWordSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { number, direction, cells } = parsed.data;

  const game = await prisma.crucigramaGame.findFirst({
    where: { id: gameId, userId: session.user.id },
    select: { layout: true, status: true },
  });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  // Defensive: once the game is over (completed or revealed) there's
  // nothing left to grade -- the board stops calling this, but guard anyway.
  if (game.status !== "in_progress") {
    return NextResponse.json({ error: "NOT_IN_PROGRESS" }, { status: 409 });
  }

  const layout = JSON.parse(game.layout) as CrosswordLayout;
  const entry = layout.entries.find((e) => e.number === number && e.direction === direction);
  if (!entry) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  return NextResponse.json({ correct: isEntryCorrect(entry, cells), number, direction });
}
