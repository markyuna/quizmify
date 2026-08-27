import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { isEffectivelyPro } from "@/lib/paywall";
import { getRequestLocale } from "@/i18n/get-locale";
import { normalizeTopic } from "@/lib/topicUtils";
import { puzzleDuJourCreateSchema } from "@/schemas/form/puzzleDuJour";
import { PUZZLE_DU_JOUR_DAILY_LIMIT, PUZZLE_DU_JOUR_GRID, getTodayDateKey } from "@/lib/puzzleDuJour";
import { generatePuzzleDuJourImage, isContentPolicyViolation } from "@/lib/puzzleDuJourImage";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(details ? { error: message, details } : { error: message }, { status });
}

/** Thrown inside the transaction below to roll back a game created against
 * a ticket that another concurrent request already consumed first. */
class TicketAlreadyConsumedError extends Error {}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, premiumUntil: true },
    });
    if (!user) return jsonError("Unauthorized", 401);

    const isPro = isEffectivelyPro(user);
    // Set only when a non-Pro user is spending a previously-purchased
    // ticket instead of their Pro daily allowance -- marked "used" only
    // after the game below is actually created, never before (see the
    // update near the end of this handler).
    let consumedUnlockId: string | null = null;
    const date = getTodayDateKey();

    if (isPro) {
      const playedToday = await prisma.puzzleDuJourGame.count({ where: { userId, date } });
      if (playedToday >= PUZZLE_DU_JOUR_DAILY_LIMIT) {
        return jsonError("PUZZLE_DU_JOUR_DAILY_LIMIT_REACHED", 403);
      }
    } else {
      // Not subject to PUZZLE_DU_JOUR_DAILY_LIMIT -- that cap bounds Pro's
      // free daily allowance, not a paid, non-expiring ticket. Oldest
      // ticket first (FIFO) when more than one has accumulated.
      const availableUnlock = await prisma.neuronUnlock.findFirst({
        where: { userId, gameKey: "puzzleDuJour", status: "available" },
        orderBy: { purchasedAt: "asc" },
        select: { id: true },
      });
      if (!availableUnlock) {
        return jsonError("PUZZLE_DU_JOUR_REQUIRES_PRO", 403);
      }
      consumedUnlockId = availableUnlock.id;
    }

    const body = await req.json();
    const parsed = puzzleDuJourCreateSchema.parse(body);
    // `topic` is exactly what the user typed (trimmed) -- shown in the
    // puzzle's title/history. `topicNormalized` is only for cache matching
    // (see the model's own comment) and must never overwrite `topic`.
    const topic = parsed.topic.trim();
    const topicNormalized = normalizeTopic(topic);
    const language = await getRequestLocale();
    const { cols: gridCols, rows: gridRows } = PUZZLE_DU_JOUR_GRID[parsed.difficulty];

    // Reuse a previously generated image for this exact topic+language --
    // regardless of difficulty or which user generated it first -- before
    // spending money on a new one.
    const cached = await prisma.puzzleDuJourGame.findFirst({
      where: { topicNormalized, language },
      orderBy: { createdAt: "desc" },
      select: { imageUrl: true },
    });

    let imageUrl = cached?.imageUrl ?? null;
    if (!imageUrl) {
      try {
        imageUrl = await generatePuzzleDuJourImage(userId, topic);
      } catch (error) {
        if (isContentPolicyViolation(error)) {
          // Deliberately NOT counted against the daily limit -- no row is
          // ever inserted for a rejected topic.
          return jsonError("PUZZLE_DU_JOUR_TOPIC_BLOCKED", 422);
        }
        console.error("generatePuzzleDuJourImage failed:", error);
        return jsonError("PUZZLE_DU_JOUR_IMAGE_GENERATION_FAILED", 500);
      }
    }

    // Game creation and ticket consumption are one transaction on purpose:
    // if another concurrent request already consumed this exact ticket
    // between the availability check above and now, the atomic updateMany
    // below affects 0 rows and we throw -- rolling the just-created game
    // back out too, instead of a manual delete() after the fact (which
    // would leave a window where an unbacked game briefly exists). Image
    // generation already happened before this point either way; a request
    // that loses this race pays that cost without getting a game, same as
    // if it had never found a ticket at all.
    let game: { id: string };
    try {
      game = await prisma.$transaction(async (tx) => {
        const created = await tx.puzzleDuJourGame.create({
          data: {
            userId,
            date,
            topic,
            topicNormalized,
            language,
            difficulty: parsed.difficulty,
            gridCols,
            gridRows,
            imageUrl,
            status: "in_progress",
          },
        });

        if (consumedUnlockId) {
          const consumed = await tx.neuronUnlock.updateMany({
            where: { id: consumedUnlockId, status: "available" },
            data: { status: "used", usedAt: new Date() },
          });
          if (consumed.count !== 1) {
            throw new TicketAlreadyConsumedError();
          }
        }

        return created;
      });
    } catch (error) {
      if (error instanceof TicketAlreadyConsumedError) {
        return jsonError("PUZZLE_DU_JOUR_REQUIRES_PRO", 403);
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      gameId: game.id,
      imageUrl,
      gridCols,
      gridRows,
      topic,
    });
  } catch (error) {
    console.error("POST /api/puzzle-du-jour error:", error);
    if (error instanceof z.ZodError) return jsonError("Invalid data", 400, error.flatten());
    return jsonError("Internal server error", 500);
  }
}
