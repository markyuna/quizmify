import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { getTodayDateKey } from "@/lib/guestPlay";
import { getRequestLocale } from "@/i18n/get-locale";
import { normalizeTopic } from "@/lib/topicUtils";
import { CRUCIGRAMA_COST_PER_GAME } from "@/lib/neurons/costs";
import { CRUCIGRAMA_GAME_KEY } from "@/lib/crucigrama";
import { crucigramaCreateSchema } from "@/schemas/form/crucigrama";
import { buildCrosswordPuzzle } from "@/lib/crucigrama/generate";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Create a Crucigrama game. Free users pay CRUCIGRAMA_COST_PER_GAME up front
 * (fixed, difficulty-independent), debited atomically inside the same
 * transaction that creates the game -- same pattern as POST /api/akinator.
 * A Pro user's first *completed* game of the day is free (the
 * UserDailyFreeGame row is written on completion in [gameId]/submit).
 *
 * AI word generation + deterministic grid building happen BEFORE the
 * transaction (same stance as Puzzle du Jour's image generation): a request
 * that loses the Neuron race pays the OpenAI cost without a game, which is
 * acceptable and rare.
 */
export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, premiumUntil: true, neuronsBalance: true },
    });
    if (!user) return jsonError("User not found", 404);
    const isPro = isEffectivelyPro(user);

    // One in-progress game at a time, Pro or not -- same guard as akinator/morpion.
    const openGame = await prisma.crucigramaGame.findFirst({
      where: { userId, status: "in_progress" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (openGame) return NextResponse.json({ gameId: openGame.id });

    const parsed = crucigramaCreateSchema.parse(await req.json());
    const topic = parsed.topic.trim();
    const topicNormalized = normalizeTopic(topic);
    const language = await getRequestLocale();
    const { difficulty } = parsed;

    // Pro's first *completed* game of the day is free. FREE users always pay.
    const freeQuotaUsed =
      isPro &&
      (await prisma.userDailyFreeGame.findUnique({
        where: {
          userId_gameKey_date: { userId, gameKey: CRUCIGRAMA_GAME_KEY, date: getTodayDateKey() },
        },
        select: { id: true },
      })) !== null;
    const chargeNeurons = !isPro || freeQuotaUsed;

    // Cheap fail-fast before spending an OpenAI call. The atomic decrement in
    // the transaction below is still the real guard against a race.
    if (chargeNeurons && user.neuronsBalance < CRUCIGRAMA_COST_PER_GAME) {
      return jsonError("INSUFFICIENT_NEURONS", 402);
    }

    // Reuse a previously generated word set + grid for this exact
    // topic+language+difficulty before paying for generation -- same "cache
    // by normalized topic" stance as sourceQuestions() / PuzzleDuJourGame.
    const cached = await prisma.crucigramaGame.findFirst({
      where: { topicNormalized, language, difficulty },
      orderBy: { createdAt: "desc" },
      select: { words: true, layout: true, wordCount: true },
    });

    let words: string;
    let layout: string;
    let wordCount: number;

    if (cached) {
      ({ words, layout, wordCount } = cached);
    } else {
      const puzzle = await buildCrosswordPuzzle({
        topic,
        topicNormalized,
        difficulty,
        language,
        seed: `${userId}:${Date.now()}`,
      });
      if (!puzzle) return jsonError("CRUCIGRAMA_GENERATION_FAILED", 422);
      words = JSON.stringify(puzzle.words);
      layout = JSON.stringify(puzzle.layout);
      wordCount = puzzle.words.length;
    }

    const game = await prisma.$transaction(async (tx) => {
      if (chargeNeurons) {
        const debited = await tx.user.updateMany({
          where: { id: userId, neuronsBalance: { gte: CRUCIGRAMA_COST_PER_GAME } },
          data: { neuronsBalance: { decrement: CRUCIGRAMA_COST_PER_GAME } },
        });
        if (debited.count === 0) throw new Error("INSUFFICIENT_NEURONS");
        await tx.neuronTransaction.create({
          data: {
            userId,
            type: "spend_crucigrama",
            amount: -CRUCIGRAMA_COST_PER_GAME,
            gameKey: CRUCIGRAMA_GAME_KEY,
          },
        });
      }
      return tx.crucigramaGame.create({
        data: {
          userId,
          date: getTodayDateKey(),
          topic,
          topicNormalized,
          language,
          difficulty,
          words,
          layout,
          wordCount,
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
    console.error("POST /api/crucigrama error:", error);
    return jsonError("Failed to create game", 500);
  }
}
