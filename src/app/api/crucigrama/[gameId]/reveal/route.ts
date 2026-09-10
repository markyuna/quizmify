import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { getTodayDateKey } from "@/lib/guestPlay";
import { CRUCIGRAMA_GAME_KEY } from "@/lib/crucigrama";
import type { CrosswordLayout } from "@/lib/crucigrama/grid";

type Params = { params: Promise<{ gameId: string }> };

/**
 * "Reveal answers": the player gives up. Flips the game in_progress ->
 * `revealed` (a terminal state distinct from `completed`), credits NO XP,
 * and returns the full solution grid so the board can paint it -- revealing
 * is intentional and the game is over, so the letters are no longer secret.
 *
 * A Pro player's daily free Crucigrama slot is still consumed here, exactly
 * as on a real completion (same check-then-create as [gameId]/submit and
 * the "lost" branch of /api/akinator/[gameId]/guess) -- giving up still
 * counts as "played your free game today".
 */
export async function POST(_request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { gameId } = await params;

  const game = await prisma.crucigramaGame.findFirst({ where: { id: gameId, userId } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status !== "in_progress") {
    return NextResponse.json({ error: "NOT_IN_PROGRESS" }, { status: 409 });
  }

  const layout = JSON.parse(game.layout) as CrosswordLayout;
  const solution: Record<string, string> = {};
  for (const c of layout.cells) solution[`${c.row},${c.col}`] = c.letter;

  await prisma.$transaction(async (tx) => {
    // Conditional flip -- only the request that moves the row out of
    // in_progress marks the free-game slot, so a double-submit is a no-op.
    const flipped = await tx.crucigramaGame.updateMany({
      where: { id: gameId, status: "in_progress" },
      data: { status: "revealed", completedAt: new Date() },
    });
    if (flipped.count === 0) return;

    const previousUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { subscriptionStatus: true, premiumUntil: true },
    });
    if (!isEffectivelyPro(previousUser)) return;

    // Pro's first Crucigrama of the day is free -- giving up still burns it.
    // check-then-create (a bare create hitting the unique constraint would
    // abort this $transaction), same as [gameId]/submit.
    const dateKey = getTodayDateKey();
    const alreadyFree = await tx.userDailyFreeGame.findUnique({
      where: {
        userId_gameKey_date: { userId, gameKey: CRUCIGRAMA_GAME_KEY, date: dateKey },
      },
      select: { id: true },
    });
    if (!alreadyFree) {
      await tx.userDailyFreeGame.create({
        data: { userId, gameKey: CRUCIGRAMA_GAME_KEY, date: dateKey, gameId },
      });
    }
  });

  return NextResponse.json({ status: "revealed", solution });
}
