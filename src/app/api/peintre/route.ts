import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { getTodayDateKey } from "@/lib/guestPlay";
import { getRequestLocale } from "@/i18n/get-locale";
import { PEINTRE_COST_PER_GAME } from "@/lib/neurons/costs";
import { PEINTRE_GAME_KEY } from "@/lib/peintre/config";
import { findPeintreDeck } from "@/lib/peintre/decks";
import { peintreCreateSchema } from "@/schemas/form/peintre";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Create a "Qui est le peintre?" game. Free users pay PEINTRE_COST_PER_GAME
 * up front (fixed, deck-independent), debited atomically inside the same
 * transaction that creates the game -- same pattern as POST /api/crucigrama.
 * A Pro user's first *completed* game of the day is free (the
 * UserDailyFreeGame row is written on completion in [gameId]/submit).
 *
 * No AI, no generation: the deck is a static question set, so there is
 * nothing to build before the transaction.
 */
export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const userId = session.user.id;

  try {
    const parsed = peintreCreateSchema.parse(await req.json());
    const deck = findPeintreDeck(parsed.deckKey);
    if (!deck) return jsonError("INVALID_DECK", 400);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, premiumUntil: true, neuronsBalance: true },
    });
    if (!user) return jsonError("User not found", 404);
    const isPro = isEffectivelyPro(user);

    // One in-progress game at a time, Pro or not -- same guard as
    // akinator/morpion/crucigrama.
    const openGame = await prisma.peintreGame.findFirst({
      where: { userId, status: "in_progress" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (openGame) return NextResponse.json({ gameId: openGame.id });

    // Pro's first *completed* game of the day is free. FREE users always pay.
    const freeQuotaUsed =
      isPro &&
      (await prisma.userDailyFreeGame.findUnique({
        where: {
          userId_gameKey_date: { userId, gameKey: PEINTRE_GAME_KEY, date: getTodayDateKey() },
        },
        select: { id: true },
      })) !== null;
    const chargeNeurons = !isPro || freeQuotaUsed;

    // Cheap fail-fast; the atomic decrement in the transaction is the real
    // guard against a race.
    if (chargeNeurons && user.neuronsBalance < PEINTRE_COST_PER_GAME) {
      return jsonError("INSUFFICIENT_NEURONS", 402);
    }

    const language = await getRequestLocale();

    const game = await prisma.$transaction(async (tx) => {
      if (chargeNeurons) {
        const debited = await tx.user.updateMany({
          where: { id: userId, neuronsBalance: { gte: PEINTRE_COST_PER_GAME } },
          data: { neuronsBalance: { decrement: PEINTRE_COST_PER_GAME } },
        });
        if (debited.count === 0) throw new Error("INSUFFICIENT_NEURONS");
        await tx.neuronTransaction.create({
          data: {
            userId,
            type: "spend_peintre",
            amount: -PEINTRE_COST_PER_GAME,
            gameKey: PEINTRE_GAME_KEY,
          },
        });
      }
      return tx.peintreGame.create({
        data: {
          userId,
          date: getTodayDateKey(),
          deckKey: deck.deckKey,
          language,
          status: "in_progress",
        },
        select: { id: true },
      });
    });

    return NextResponse.json({ gameId: game.id });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_NEURONS") {
      return jsonError("INSUFFICIENT_NEURONS", 402);
    }
    if (error instanceof z.ZodError) return jsonError("Invalid data", 400);
    console.error("POST /api/peintre error:", error);
    return jsonError("Failed to create game", 500);
  }
}
