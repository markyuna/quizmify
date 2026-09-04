import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { getTodayDateKey } from "@/lib/guestPlay";
import { computeDifficulty } from "@/lib/morpion/ai";
import { MORPION_COST_PER_GAME } from "@/lib/neurons/costs";
import { createEmptyBoard } from "@/lib/morpion/logic";
import { morpionCreateSchema } from "@/schemas/form/morpion";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional { difficulty } from the /morpion selector; anything invalid or
  // absent falls through to the adaptive auto-computation.
  const parsedBody = morpionCreateSchema.safeParse(await request.json().catch(() => ({})));
  const selectedDifficulty = parsedBody.success ? parsedBody.data.difficulty : undefined;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionStatus: true,
        premiumUntil: true,
        neuronsBalance: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPro = isEffectivelyPro(user);

    // One in-progress game at a time, for every user (Pro or not). A second
    // POST while a game is still open just hands back that same game rather
    // than spawning a parallel one -- which, for Pro, would also let two
    // "first game of the day" both look free before either completes.
    const openGame = await prisma.morpionGame.findFirst({
      where: { userId: session.user.id, status: "in_progress" },
      orderBy: { createdAt: "desc" },
    });
    if (openGame) {
      return NextResponse.json({
        gameId: openGame.id,
        board: JSON.parse(openGame.board),
        playerSymbol: openGame.playerSymbol,
        difficulty: openGame.difficulty,
      });
    }

    const recentGames = await prisma.morpionGame.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["won", "lost", "draw"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { status: true },
    });

    const difficulty = computeDifficulty(recentGames, selectedDifficulty);

    // Pro's first *completed* game of the day is free. Until that row exists
    // (written on completion in [gameId]/move/route.ts), a Pro create pays
    // nothing; once it exists, Pro pays Neurons like a free user. FREE users
    // are never eligible -- they always pay.
    const freeQuotaUsed =
      isPro &&
      (await prisma.userDailyFreeGame.findUnique({
        where: {
          userId_gameKey_date: {
            userId: session.user.id,
            gameKey: "morpion",
            date: getTodayDateKey(),
          },
        },
        select: { id: true },
      })) !== null;
    const chargeNeurons = !isPro || freeQuotaUsed;

    const game = await prisma.$transaction(async (tx) => {
      if (chargeNeurons) {
        const cost = MORPION_COST_PER_GAME;

        // Descuento atómico condicionado
        const updated = await tx.user.updateMany({
          where: {
            id: session.user.id,
            neuronsBalance: { gte: cost },
          },
          data: {
            neuronsBalance: { decrement: cost },
          },
        });

        if (updated.count === 0) {
          throw new Error("INSUFFICIENT_NEURONS");
        }

        // Registrar transacción
        await tx.neuronTransaction.create({
          data: {
            userId: session.user.id,
            type: "spend_morpion",
            amount: -cost,
            gameKey: "morpion",
          },
        });
      }

      // Crear partida
      return tx.morpionGame.create({
        data: {
          userId: session.user.id,
          board: JSON.stringify(createEmptyBoard()),
          difficulty,
          playerSymbol: "X",
          status: "in_progress",
        },
      });
    });

    return NextResponse.json({
      gameId: game.id,
      board: JSON.parse(game.board),
      playerSymbol: game.playerSymbol,
      difficulty: game.difficulty,
    });
  } catch (error) {
    console.error("Create game error:", error);

    if (error instanceof Error && error.message === "INSUFFICIENT_NEURONS") {
      return NextResponse.json({ error: "Insufficient neurons" }, { status: 402 });
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
