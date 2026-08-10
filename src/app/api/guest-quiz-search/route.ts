import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/i18n/get-locale";
import { normalizeTopic } from "@/lib/questionGeneration";
import { sourceQuestions, incrementUsageCount } from "@/lib/questionSourcing";
import { getGuestIdFromCookie } from "@/lib/guestQuiz";

const GUEST_QUIZ_QUESTIONS = 5;

const searchSchema = z.object({
  topic: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    // Get guest ID
    const guestId = await getGuestIdFromCookie();
    if (!guestId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if guest already has a game
    const existingGames = await prisma.game.count({
      where: { guestId, userId: null },
    });
    if (existingGames >= 1) {
      return NextResponse.json({ error: "GUEST_LIMIT_REACHED" }, { status: 403 });
    }

    // Parse request
    const body = await req.json();
    const { topic: rawTopic } = searchSchema.parse(body);
    const topic = normalizeTopic(rawTopic);
    const language = await getRequestLocale();

    // Source questions
    const { questions: sourced } = await sourceQuestions({
      topic,
      difficulty: "medium",
      language,
      amount: GUEST_QUIZ_QUESTIONS,
      isGeography: false,
    });

    if (!sourced || sourced.length === 0) {
      return NextResponse.json(
        { error: "Topic not found. Please sign up to create a custom quiz." },
        { status: 404 }
      );
    }

    // Create game
    const game = await prisma.$transaction(async (tx) => {
      const createdGame = await tx.game.create({
        data: {
          gameType: "mcq",
          timeStarted: new Date(),
          userId: null,
          guestId,
          topic,
          difficulty: "medium",
          language,
          isTimed: false,
          puzzleImageUrl: null,
        },
      });

      await tx.question.createMany({
        data: sourced.map((q) => ({
          gameId: createdGame.id,
          question: q.question,
          answer: q.correct_answer,
          options: q.options,
          explanation: ("explanation" in q && q.explanation) ? q.explanation : null,
          country: q.country ?? null,
          questionType: "mcq",
        })),
      });

      return createdGame;
    });

    // Update usage count
    await incrementUsageCount(sourced);

    return NextResponse.json({ gameId: game.id }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
