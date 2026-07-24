import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { checkAnswerSchema } from "@/schemas/form/quiz";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { questionId, userAnswer } = checkAnswerSchema.parse(body);

    const question = await prisma.question.findUnique({
      where: {
        id: questionId,
      },
      select: {
        id: true,
        answer: true,
        userAnswer: true,
        isCorrect: true,
        sourceQuestionId: true,
        game: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Pregunta no encontrada" },
        { status: 404 }
      );
    }

    if (question.game.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (question.userAnswer !== null) {
      return NextResponse.json(
        { correct: question.isCorrect ?? false, correctAnswer: question.answer },
        { status: 200 }
      );
    }

    const normalizedCorrectAnswer = question.answer.trim().toLowerCase();
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const correct = normalizedCorrectAnswer === normalizedUserAnswer;

    await prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        userAnswer,
        isCorrect: correct,
      },
    });

    const trackedQuestionId = question.sourceQuestionId ?? question.id;

    const progressUpdate = correct
      ? {
          correctCount: { increment: 1 },
          needsReview: false,
          lastAnsweredCorrectly: true,
        }
      : {
          wrongCount: { increment: 1 },
          needsReview: true,
          lastAnsweredCorrectly: false,
        };

    try {
      await prisma.userQuestionProgress.upsert({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId: trackedQuestionId,
          },
        },
        update: progressUpdate,
        create: {
          userId: session.user.id,
          questionId: trackedQuestionId,
          correctCount: correct ? 1 : 0,
          wrongCount: correct ? 0 : 1,
          needsReview: !correct,
          lastAnsweredCorrectly: correct,
        },
      });
    } catch (error) {
      // Two answers in the same game can share a trackedQuestionId (e.g.
      // Practice Mistakes re-serving a question, or Kahoot mode's fast
      // auto-advance overlapping requests) -- the upsert's create/update
      // isn't atomic against a genuinely concurrent insert, so a race can
      // still hit the unique constraint after another request just created
      // the row. Fall back to a plain update instead of failing the answer.
      const isUniqueConstraintRace =
        error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002";

      if (!isUniqueConstraintRace) throw error;

      await prisma.userQuestionProgress.update({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId: trackedQuestionId,
          },
        },
        data: progressUpdate,
      });
    }

    return NextResponse.json(
      {
        correct,
        correctAnswer: question.answer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/checkAnswer error:", error);

    return NextResponse.json(
      { error: "Error al comprobar la respuesta" },
      { status: 500 }
    );
  }
}