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

    const normalizedCorrectAnswer = question.answer.trim().toLowerCase();
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const correct = normalizedCorrectAnswer === normalizedUserAnswer;

    // ✅ Guardar la respuesta en la pregunta del juego actual
    await prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        userAnswer,
        isCorrect: correct,
      },
    });

    // ✅ Actualizar progreso para practice mistakes
    const trackedQuestionId = question.sourceQuestionId ?? question.id;

    await prisma.userQuestionProgress.upsert({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId: trackedQuestionId,
        },
      },
      update: correct
        ? {
            correctCount: { increment: 1 },
            needsReview: false,
            lastAnsweredCorrectly: true,
          }
        : {
            wrongCount: { increment: 1 },
            needsReview: true,
            lastAnsweredCorrectly: false,
          },
      create: {
        userId: session.user.id,
        questionId: trackedQuestionId,
        correctCount: correct ? 1 : 0,
        wrongCount: correct ? 0 : 1,
        needsReview: !correct,
        lastAnsweredCorrectly: correct,
      },
    });

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