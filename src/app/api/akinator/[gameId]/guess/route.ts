import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { getTodayDateKey } from "@/lib/guestPlay";
import { calculateLevel } from "@/lib/xp";
import { FREE_LEVEL_CAP, FREE_XP_CAP } from "@/lib/stripe";
import { getRequestLocale } from "@/i18n/get-locale";
import { akinatorGuessSchema } from "@/schemas/form/akinator";
import { validateGuess } from "@/lib/akinator/ai";
import { getCharacterName } from "@/lib/akinator/characters";
import { AKINATOR_WIN_XP, MAX_QUESTIONS } from "@/lib/akinator/config";

type Params = { params: Promise<{ gameId: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { gameId } = await params;

  const parsed = akinatorGuessSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid guess" }, { status: 400 });
  }

  const game = await prisma.akinatorGame.findFirst({
    where: { id: gameId, userId },
  });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status !== "in_progress") {
    return NextResponse.json({ error: "GAME_OVER" }, { status: 400 });
  }

  const locale = await getRequestLocale();
  const characterName = getCharacterName(game.characterKey, locale);
  const correct = await validateGuess(
    game.characterKey,
    parsed.data.guess,
    getCharacterName(game.characterKey, "en")
  );

  if (!correct) {
    // Own $transaction, independent of the "won" branch below (mutually
    // exclusive paths): the lost-flip and the Pro daily-free-game mark
    // commit together. The conditional updateMany stays the idempotency
    // guard -- only the request that actually moves the row out of
    // in_progress (count === 1) marks the quota.
    await prisma.$transaction(async (tx) => {
      const flipped = await tx.akinatorGame.updateMany({
        where: { id: game.id, status: "in_progress" },
        data: { status: "lost", guessedName: parsed.data.guess, completedAt: new Date() },
      });
      if (flipped.count === 0) return;

      const previousUser = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { subscriptionStatus: true, premiumUntil: true },
      });
      if (!isEffectivelyPro(previousUser)) return;

      // Same check-then-create as the "won" branch / the morpion move route.
      const dateKey = getTodayDateKey();
      const alreadyFree = await tx.userDailyFreeGame.findUnique({
        where: {
          userId_gameKey_date: { userId, gameKey: "akinator", date: dateKey },
        },
        select: { id: true },
      });
      if (!alreadyFree) {
        await tx.userDailyFreeGame.create({
          data: { userId, gameKey: "akinator", date: dateKey, gameId: game.id },
        });
      }
    });
    return NextResponse.json({ won: false, characterName });
  }

  const score = Math.max(0, MAX_QUESTIONS - game.questionsAsked);

  const result = await prisma.$transaction(async (tx) => {
    // Conditional flip -- only the call that moves the row out of
    // in_progress credits XP, so a double-submitted guess can't double-pay.
    const flipped = await tx.akinatorGame.updateMany({
      where: { id: game.id, status: "in_progress" },
      data: {
        status: "won",
        score,
        xpEarned: AKINATOR_WIN_XP,
        guessedName: parsed.data.guess,
        completedAt: new Date(),
      },
    });
    if (flipped.count === 0) return { hitFreeLimit: false };

    // XP: same "xp always accrues, level capped for free users" block as
    // /api/morpion/[gameId]/move.
    const previousUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { level: true, subscriptionStatus: true, premiumUntil: true },
    });
    const isPro = isEffectivelyPro(previousUser);

    const { xp: newXp } = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: AKINATOR_WIN_XP } },
      select: { xp: true },
    });

    const trueLevel = calculateLevel(newXp);
    const newLevel = isPro ? trueLevel : Math.min(trueLevel, FREE_LEVEL_CAP);
    if (newLevel !== previousUser.level) {
      await tx.user.update({ where: { id: userId }, data: { level: newLevel } });
    }

    // Pro's first *completed* Akinator game of the day is free -- mark it
    // here, the point where "completed" (won) becomes true. check-then-
    // create for the same reason as the other two branches (a bare create
    // hitting the unique constraint aborts the rest of this $transaction).
    // A real race between two games finishing at once can still lose a
    // create; accepted -- the losing game was never charged at creation.
    if (isPro) {
      const dateKey = getTodayDateKey();
      const alreadyFree = await tx.userDailyFreeGame.findUnique({
        where: {
          userId_gameKey_date: { userId, gameKey: "akinator", date: dateKey },
        },
        select: { id: true },
      });
      if (!alreadyFree) {
        await tx.userDailyFreeGame.create({
          data: { userId, gameKey: "akinator", date: dateKey, gameId: game.id },
        });
      }
    }

    return { hitFreeLimit: !isPro && newXp >= FREE_XP_CAP };
  });

  return NextResponse.json({
    won: true,
    score,
    xpEarned: AKINATOR_WIN_XP,
    characterName,
    hitFreeLimit: result.hitFreeLimit,
  });
}
