import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getGuestIdFromCookie } from "@/lib/guestQuiz";
import { checkAnswerSchema } from "@/schemas/form/quiz";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    const userId = session?.user?.id ?? null;
    const guestId = userId ? null : await getGuestIdFromCookie();

    if (!userId && !guestId) {
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
            guestId: true,
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

    // userId is now nullable on Game (guest-played quizzes), so ownership
    // must branch: a real user only ever owns their own userId'd games, a
    // guest only owns the specific unclaimed game their cookie created.
    const isOwner = userId
      ? question.game.userId === userId
      : question.game.userId === null && question.game.guestId === guestId;

    if (!isOwner) {
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

    // UserQuestionProgress requires a real userId -- a guest (no session
    // yet) has none, so mistake-tracking is simply skipped for them. Their
    // answers are still recorded on Question.userAnswer/isCorrect above,
    // which is all /api/guest/claim-quiz needs to reconstruct the Attempt
    // once they register.
    if (userId) {
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
              userId,
              questionId: trackedQuestionId,
            },
          },
          update: progressUpdate,
          create: {
            userId,
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
              userId,
              questionId: trackedQuestionId,
            },
          },
          data: progressUpdate,
        });
      }
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