import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
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

    const game = await prisma.$transaction(async (tx) => {
      if (!isPro) {
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
