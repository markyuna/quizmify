import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { isGeographyTopic } from "@/lib/geography";
import { normalizeDifficulty, type Difficulty } from "@/lib/questionGeneration";
import { sourceQuestions, incrementUsageCount } from "@/lib/questionSourcing";
import { adjustDifficulty } from "@/lib/adaptiveDifficulty";
import type { Locale } from "@/i18n/locales";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Generates the second (adaptive-difficulty) batch of an in-progress quiz.
 * Called by the client once the user reaches the last question of the
 * first batch. Difficulty for this batch is derived from *this game's own*
 * Question.isCorrect values -- persisted by /api/checkAnswer as the user
 * plays, not from anything the client reports -- so there's nothing here a
 * client could spoof to game the difficulty (and no reason to bother: it
 * only affects upcoming question difficulty, never scoring or XP, which
 * are always computed later from the server-verified answers).
 */
export async function POST(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }

    const { gameId } = await params;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        userId: true,
        topic: true,
        difficulty: true,
        language: true,
        plannedQuestionCount: true,
      },
    });

    if (!game || game.userId !== session.user.id) {
      return jsonError("Not found", 404);
    }

    if (!game.plannedQuestionCount) {
      return jsonError("Adaptive difficulty isn't enabled for this game", 400);
    }

    const existingQuestions = await prisma.question.findMany({
      where: { gameId },
      select: { isCorrect: true },
    });

    const remaining = game.plannedQuestionCount - existingQuestions.length;
    if (remaining <= 0) {
      return jsonError("This game's questions are already fully generated", 409);
    }

    const answered = existingQuestions.filter((q) => q.isCorrect !== null);
    const correctCount = answered.filter((q) => q.isCorrect === true).length;

    const currentDifficulty = normalizeDifficulty((game.difficulty as Difficulty) ?? "medium");
    const nextDifficulty = adjustDifficulty(currentDifficulty, correctCount, answered.length);
    const isGeography = isGeographyTopic(game.topic);

    const { questions: sourced } = await sourceQuestions({
      topic: game.topic,
      difficulty: nextDifficulty,
      language: game.language as Locale,
      amount: remaining,
      isGeography,
    });

    if (sourced.length === 0) {
      return jsonError("Could not fetch or generate questions.", 500);
    }

    const createdQuestions = await prisma.$transaction(
      sourced.map((question) =>
        prisma.question.create({
          data: {
            question: question.question,
            answer: question.correct_answer,
            options: question.options,
            explanation:
              "explanation" in question && question.explanation ? question.explanation : null,
            country: question.country ?? null,
            gameId: game.id,
            questionType: "mcq",
          },
          select: {
            id: true,
            question: true,
            answer: true,
            options: true,
            explanation: true,
            country: true,
            imageUrl: true,
          },
        })
      )
    );

    await incrementUsageCount(sourced);

    return NextResponse.json({
      success: true,
      difficultyAdjusted: nextDifficulty !== currentDifficulty,
      newDifficulty: nextDifficulty,
      questions: createdQuestions,
    });
  } catch (error) {
    console.error("POST /api/game/[gameId]/next-batch error:", error);
    return jsonError("Internal server error", 500);
  }
}
