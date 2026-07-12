import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { quizCreationSchema } from "@/schemas/form/quiz";
import { getRequestLocale } from "@/i18n/get-locale";
import { isUserAtFreeLimit } from "@/lib/paywall";
import { isGeographyTopic } from "@/lib/geography";
import { TIMED_MODE_SECONDS_PER_QUESTION } from "@/lib/timedMode";
import { normalizeTopic, normalizeDifficulty } from "@/lib/questionGeneration";
import { sourceQuestions, incrementUsageCount } from "@/lib/questionSourcing";
import { MIN_QUESTIONS_FOR_ADAPTIVE_DIFFICULTY, splitIntoBatches } from "@/lib/adaptiveDifficulty";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }

    if (await isUserAtFreeLimit(session.user.id)) {
      return jsonError("FREE_LIMIT_REACHED", 403);
    }

    const body = await req.json();
    const parsedBody = quizCreationSchema.parse(body);

    const topic = normalizeTopic(parsedBody.topic);
    const amount = parsedBody.amount;
    const difficulty = normalizeDifficulty(parsedBody.difficulty);
    const language = await getRequestLocale();
    const isGeography = isGeographyTopic(topic);
    const isTimed = parsedBody.isTimed;

    // Long enough quizzes generate only the first half of questions now,
    // then adjust difficulty from in-quiz performance and generate the
    // rest via /api/game/[gameId]/next-batch once the user reaches it --
    // see src/lib/adaptiveDifficulty.ts.
    const useAdaptiveDifficulty = amount >= MIN_QUESTIONS_FOR_ADAPTIVE_DIFFICULTY;
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

    const game = await prisma.$transaction(async (tx) => {
      const createdGame = await tx.game.create({
        data: {
          gameType: "mcq",
          timeStarted: new Date(),
          userId: session.user.id,
          topic,
          difficulty,
          language,
          isTimed,
          timePerQuestionSec: isTimed ? TIMED_MODE_SECONDS_PER_QUESTION : null,
          plannedQuestionCount: useAdaptiveDifficulty ? amount : null,
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
