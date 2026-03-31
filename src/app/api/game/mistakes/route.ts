import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

const MAX_QUESTIONS = 10;

type PracticeQuestion = {
  id: string;
  question: string;
  answer: string;
  options: string[];
  questionType: string;
  explanation: string | null;
  sourceQuestionId: string | null;
};

export async function POST() {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const progressEntries = await prisma.userQuestionProgress.findMany({
      where: {
        userId,
        needsReview: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        question: {
          select: {
            id: true,
            question: true,
            answer: true,
            options: true,
            questionType: true,
            explanation: true,
            sourceQuestionId: true,
          },
        },
      },
      take: MAX_QUESTIONS * 3,
    });

    const rawQuestions = progressEntries
      .map((entry) => entry.question)
      .filter((question) => {
        return (
          !!question &&
          question.question.trim() !== "" &&
          question.answer.trim() !== "" &&
          Array.isArray(question.options) &&
          question.options.length > 0
        );
      });

    const uniqueQuestionsMap = new Map<string, PracticeQuestion>();

    for (const question of rawQuestions) {
      const normalizedQuestion: PracticeQuestion = {
        id: question.id,
        question: question.question,
        answer: question.answer,
        options: question.options,
        questionType: question.questionType || "mcq",
        explanation: question.explanation ?? null,
        sourceQuestionId: question.sourceQuestionId ?? null,
      };

      const dedupeKey =
        normalizedQuestion.sourceQuestionId?.trim() ||
        `${normalizedQuestion.question.trim().toLowerCase()}::${normalizedQuestion.answer
          .trim()
          .toLowerCase()}`;

      if (!uniqueQuestionsMap.has(dedupeKey)) {
        uniqueQuestionsMap.set(dedupeKey, normalizedQuestion);
      }
    }

    const questionsToPractice = Array.from(uniqueQuestionsMap.values()).slice(
      0,
      MAX_QUESTIONS
    );

    if (questionsToPractice.length === 0) {
      return NextResponse.json(
        { error: "No incorrect answers found to practice yet." },
        { status: 404 }
      );
    }

    const game = await prisma.game.create({
      data: {
        userId,
        topic: "Practice Mistakes",
        gameType: "mcq",
        timeStarted: new Date(),
        questions: {
          create: questionsToPractice.map((question) => ({
            question: question.question,
            answer: question.answer,
            options: question.options,
            questionType: question.questionType,
            explanation: question.explanation,
            sourceQuestionId: question.sourceQuestionId ?? question.id,
          })),
        },
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({ gameId: game.id }, { status: 200 });
  } catch (error) {
    console.error("POST /api/game/mistakes error:", error);

    return NextResponse.json(
      { error: "Failed to create mistakes practice quiz." },
      { status: 500 }
    );
  }
}