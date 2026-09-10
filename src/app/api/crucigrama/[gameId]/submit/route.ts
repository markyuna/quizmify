import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { getTodayDateKey } from "@/lib/guestPlay";
import { calculateLevel } from "@/lib/xp";
import { FREE_LEVEL_CAP, FREE_XP_CAP } from "@/lib/stripe";
import { crucigramaSubmitSchema } from "@/schemas/form/crucigrama";
import { CRUCIGRAMA_GAME_KEY, CRUCIGRAMA_XP, isCrucigramaDifficulty } from "@/lib/crucigrama";
import { isEntryCorrect, normalizeCellInput, type CrosswordLayout } from "@/lib/crucigrama/grid";

type Params = { params: Promise<{ gameId: string }> };

/**
 * Grade the filled grid. Nothing is persisted until every cell is correct;
 * before that it just returns per-word feedback so the player can keep
 * working. On a full solve it flips the game to `completed` via a
 * conditional updateMany (so a double-submit can't double-credit XP) and
 * awards flat XP with the same "xp accrues, level capped for free users"
 * block as /api/akinator/[gameId]/guess.
 */
export async function POST(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { gameId } = await params;

  const parsed = crucigramaSubmitSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const game = await prisma.crucigramaGame.findFirst({ where: { id: gameId, userId } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const layout = JSON.parse(game.layout) as CrosswordLayout;
  const filled = parsed.data.cells;

  const wordResults = layout.entries.map((e) => ({
    number: e.number,
    direction: e.direction,
    correct: isEntryCorrect(e, filled),
  }));
  const correctWords = wordResults.filter((w) => w.correct).length;
  const allCellsCorrect = layout.cells.every(
    (c) => normalizeCellInput(filled[`${c.row},${c.col}`] ?? "") === c.letter
  );

  if (game.status !== "in_progress") {
    return NextResponse.json({
      completed: true,
      alreadyCompleted: true,
      xpEarned: game.xpEarned,
      correctWords: game.score,
      wordResults,
    });
  }

  // Not solved yet -- feedback only, nothing persisted.
  if (!allCellsCorrect) {
    return NextResponse.json({ completed: false, correctWords, wordResults });
  }

  const difficulty = isCrucigramaDifficulty(game.difficulty) ? game.difficulty : "easy";
  const xpAward = CRUCIGRAMA_XP[difficulty];

  const result = await prisma.$transaction(async (tx) => {
    // Conditional flip -- only the request that moves the row out of
    // in_progress credits XP, so a double-submit can't double-pay.
    const flipped = await tx.crucigramaGame.updateMany({
      where: { id: gameId, status: "in_progress" },
      data: {
        status: "completed",
        score: correctWords,
        xpEarned: xpAward,
        completedAt: new Date(),
      },
    });
    if (flipped.count === 0) return { hitFreeLimit: false };

    const previousUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { level: true, subscriptionStatus: true, premiumUntil: true },
    });
    const isPro = isEffectivelyPro(previousUser);

    // xp always accrues; only the *level* is capped for free users -- same
    // invariant as /api/quiz/submit and /api/morpion/[gameId]/move.
    const { xp: newXp } = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: xpAward } },
      select: { xp: true },
    });
    const trueLevel = calculateLevel(newXp);
    const newLevel = isPro ? trueLevel : Math.min(trueLevel, FREE_LEVEL_CAP);
    if (newLevel !== previousUser.level) {
      await tx.user.update({ where: { id: userId }, data: { level: newLevel } });
    }

    // Pro's first *completed* Crucigrama of the day is free -- mark it here,
    // the point "completed" becomes true. check-then-create (a bare create
    // hitting the unique constraint would abort this $transaction).
    if (isPro) {
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
    }

    return { hitFreeLimit: !isPro && newXp >= FREE_XP_CAP };
  });

  return NextResponse.json({
    completed: true,
    xpEarned: xpAward,
    correctWords,
    wordResults,
    hitFreeLimit: result.hitFreeLimit,
  });
}
