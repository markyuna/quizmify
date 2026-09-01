import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { AKINATOR_COST_PER_GAME } from "@/lib/neurons/costs";
import { getImageUrl, getRandomCharacterKey } from "@/lib/akinator/characters";

/**
 * Create an Akinator game. Free users pay AKINATOR_COST_PER_GAME up front,
 * debited atomically inside the same transaction that creates the game
 * (same pattern as POST /api/morpion) so a mid-write crash can't take the
 * Neurons without handing back a game.
 */
export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, premiumUntil: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const isPro = isEffectivelyPro(user);

    const game = await prisma.$transaction(async (tx) => {
      if (!isPro) {
        const debited = await tx.user.updateMany({
          where: { id: userId, neuronsBalance: { gte: AKINATOR_COST_PER_GAME } },
          data: { neuronsBalance: { decrement: AKINATOR_COST_PER_GAME } },
        });
        if (debited.count === 0) {
          throw new Error("INSUFFICIENT_NEURONS");
        }
        await tx.neuronTransaction.create({
          data: {
            userId,
            type: "spend_akinator",
            amount: -AKINATOR_COST_PER_GAME,
            gameKey: "akinator",
          },
        });
      }

      const characterKey = getRandomCharacterKey();
      return tx.akinatorGame.create({
        data: { userId, characterKey, imageUrl: getImageUrl(characterKey), conversation: "[]" },
        select: { id: true },
      });
    });

    return NextResponse.json({ gameId: game.id });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_NEURONS") {
      return NextResponse.json({ error: "INSUFFICIENT_NEURONS" }, { status: 402 });
    }
    console.error("POST /api/akinator error:", error);
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
  }
}
