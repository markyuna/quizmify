import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { quizCreationSchema } from "@/schemas/form/quiz";
import { getRequestLocale } from "@/i18n/get-locale";
import { isUserAtFreeLimit, isUserPro } from "@/lib/paywall";
import { isGeographyTopic } from "@/lib/geography";
import { TIMED_MODE_SECONDS_PER_QUESTION } from "@/lib/timedMode";
import { normalizeTopic, normalizeDifficulty } from "@/lib/questionGeneration";
import { sourceQuestions, incrementUsageCount } from "@/lib/questionSourcing";
import { MIN_QUESTIONS_FOR_ADAPTIVE_DIFFICULTY, splitIntoBatches } from "@/lib/adaptiveDifficulty";
import { generatePuzzleImage, PuzzleImageError } from "@/lib/puzzleImage";
import { getGuestIdFromCookie } from "@/lib/guestQuiz";

// A guest is capped well below the adaptive-difficulty threshold and never
// gets Puzzle Mode (DALL-E generation), so a single unauthenticated request
// can't be scripted into unbounded OpenAI cost.
const GUEST_MAX_QUESTIONS = 5;

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    const userId = session?.user?.id ?? null;
    const guestId = userId ? null : await getGuestIdFromCookie();

    if (!userId && !guestId) {
      return jsonError("Unauthorized", 401);
    }

    if (userId && (await isUserAtFreeLimit(userId))) {
      return jsonError("FREE_LIMIT_REACHED", 403);
    }

    const body = await req.json();
    const parsedBody = quizCreationSchema.parse(body);

    if (guestId) {
      // Abuse brake: one guest-played quiz per guestId, enforced here (not
      // just in the UI) since the cookie is client-controlled.
      const existingGuestGames = await prisma.game.count({
        where: { guestId, userId: null },
      });
      if (existingGuestGames >= 1) {
        return jsonError("GUEST_LIMIT_REACHED", 403);
      }
      if (parsedBody.puzzleMode) {
        return jsonError("PUZZLE_REQUIRES_PRO", 403);
      }
      if (parsedBody.amount > GUEST_MAX_QUESTIONS) {
        return jsonError("GUEST_AMOUNT_LIMIT", 400);
      }
    }

    const topic = normalizeTopic(parsedBody.topic);
    const amount = parsedBody.amount;
    const difficulty = normalizeDifficulty(parsedBody.difficulty);
    const language = await getRequestLocale();
    const isGeography = isGeographyTopic(topic);
    const isTimed = parsedBody.isTimed;
    const puzzleMode = parsedBody.puzzleMode;

    if (puzzleMode && (!userId || !(await isUserPro(userId)))) {
      return jsonError("PUZZLE_REQUIRES_PRO", 403);
    }

    // Long enough quizzes generate only the first half of questions now,
    // then adjust difficulty from in-quiz performance and generate the
    // rest via /api/game/[gameId]/next-batch once the user reaches it --
    // see src/lib/adaptiveDifficulty.ts. Guests never get adaptive
    // difficulty (next-batch requires a session), so everything is
    // generated in one batch for them regardless of amount.
    const useAdaptiveDifficulty = !guestId && amount >= MIN_QUESTIONS_FOR_ADAPTIVE_DIFFICULTY;
    const { firstBatch } = splitIntoBatches(amount);
    const requestAmount = useAdaptiveDifficulty ? firstBatch : amount;

    const { questions: sourced, cachedCount, poolTarget } = await sourceQuestions({
      topic,
      difficulty,
      language,
      amount: requestAmount,
      isGeography,
    });

    if (sourced.length === 0) {
      return jsonError("Could not fetch or generate questions.", 500);
    }

    let puzzleImageUrl: string | null = null;
    if (puzzleMode) {
      try {
        puzzleImageUrl = await generatePuzzleImage(topic);
      } catch (error) {
        console.error("generatePuzzleImage failed:", error);
        // Storage misconfiguration and a flaky DALL-E call both break the
        // same feature, but only one of them is worth retrying -- keep the
        // codes distinct so logs and clients can tell them apart.
        return jsonError(
          error instanceof PuzzleImageError
            ? error.code
            : "PUZZLE_IMAGE_GENERATION_FAILED",
          500
        );
      }
    }

    const game = await prisma.$transaction(async (tx) => {
      const createdGame = await tx.game.create({
        data: {
          gameType: "mcq",
          timeStarted: new Date(),
          userId,
          guestId,
          topic,
          difficulty,
          language,
          isTimed,
          timePerQuestionSec: isTimed ? TIMED_MODE_SECONDS_PER_QUESTION : null,
          plannedQuestionCount: useAdaptiveDifficulty ? amount : null,
          puzzleImageUrl,
        },
      });

      await tx.question.createMany({
        data: sourced.map((question) => ({
          question: question.question,
          answer: question.correct_answer,
          options: question.options,
          explanation:
            "explanation" in question && question.explanation
              ? question.explanation
              : null,
          country: question.country ?? null,
          gameId: createdGame.id,
          questionType: "mcq",
        })),
      });

      return createdGame;
    });

    await incrementUsageCount(sourced);

    return NextResponse.json(
      {
        success: true,
        gameId: game.id,
        source: cachedCount >= poolTarget ? "supabase_cache" : cachedCount > 0 ? "supabase_plus_ai" : "ai",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/game error:", error);

    if (error instanceof z.ZodError) {
      return jsonError("Invalid data", 400, error.flatten());
    }

    if (error instanceof Error) {
      return jsonError("Internal server error", 500, {
        message: error.message,
      });
    }

    return jsonError("Internal server error", 500);
  }
}
