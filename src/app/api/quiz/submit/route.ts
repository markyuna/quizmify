import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { calculateEarnedXp, calculateLevel } from "@/lib/xp";
import { FREE_XP_CAP, FREE_LEVEL_CAP } from "@/lib/stripe";
import { submitQuizSchema } from "@/schemas/form/quiz";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await req.json();
    const parsedBody = submitQuizSchema.parse(body);

    const game = await prisma.game.findFirst({
      where: {
        id: parsedBody.gameId,
        userId,
      },
      include: {
        questions: {
          select: {
            id: true,
            answer: true,
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (!game.questions.length) {
      return NextResponse.json(
        { error: "This quiz has no questions" },
        { status: 400 }
      );
    }

    const existingAttempt = await prisma.attempt.findFirst({
      where: {
        gameId: game.id,
        userId,
      },
      select: {
        id: true,
        score: true,
        correctAnswers: true,
        totalQuestions: true,
      },
    });

    if (existingAttempt) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true },
      });

      const level = currentUser?.level ?? 1;

      return NextResponse.json(
        {
          success: true,
          attemptId: existingAttempt.id,
          score: existingAttempt.score,
          correctAnswers: existingAttempt.correctAnswers,
          totalQuestions: existingAttempt.totalQuestions,
          earnedXp: 0,
          newXp: currentUser?.xp ?? 0,
          newLevel: level,
          previousLevel: level,
          didLevelUp: false,
        },
        { status: 200 }
      );
    }

    const questionMap = new Map(
      game.questions.map((question) => [question.id, question])
    );

    const uniqueAnswersMap = new Map<string, string>();

    for (const answer of parsedBody.answers) {
      if (!uniqueAnswersMap.has(answer.questionId)) {
        uniqueAnswersMap.set(answer.questionId, answer.selectedAnswer.trim());
      }
    }

    let correctAnswers = 0;

    const answersToCreate = Array.from(uniqueAnswersMap.entries())
      .map(([questionId, selectedAnswer]) => {
        const question = questionMap.get(questionId);

        if (!question) {
          return null;
        }

        const isCorrect =
          question.answer.trim().toLowerCase() === selectedAnswer.toLowerCase();

        if (isCorrect) {
          correctAnswers += 1;
        }

        return {
          questionId,
          selectedAnswer,
          isCorrect,
        };
      })
      .filter(
        (
          answer
        ): answer is {
          questionId: string;
          selectedAnswer: string;
          isCorrect: boolean;
        } => answer !== null
      );

    const totalQuestions = game.questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    const safeTimeSpent = Math.max(
      0,
      Math.min(parsedBody.timeSpent, 60 * 60 * 3)
    );

    const earnedXp = calculateEarnedXp({
      correctAnswers,
      totalQuestions,
    });

    const result = await prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.attempt.create({
        data: {
          userId,
          gameId: game.id,
          score,
          totalQuestions,
          correctAnswers,
          timeSpent: safeTimeSpent,
          answers: {
            create: answersToCreate,
          },
        },
      });

      await tx.game.update({
        where: {
          id: game.id,
        },
        data: {
          score,
          timeEnded: new Date(),
        },
      });

      const previousUser = await tx.user.findUnique({
        where: { id: userId },
        select: { level: true, subscriptionStatus: true },
      });

      if (!previousUser) {
        return {
          attempt: createdAttempt,
          earnedXp: 0,
          newXp: 0,
          previousLevel: 1,
          newLevel: 1,
          didLevelUp: false,
          hitFreeLimit: false,
        };
      }

      const previousLevel = previousUser.level;
      const isPro = previousUser.subscriptionStatus === "pro";

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: earnedXp } },
        select: { xp: true },
      });

      let newXp = updatedUser.xp;
      let newLevel = calculateLevel(newXp);
      // Trigger when user reaches or exceeds the cap level, not just when XP crosses 200
      const hitFreeLimit = !isPro && newLevel >= FREE_LEVEL_CAP;

      if (hitFreeLimit) {
        newXp = FREE_XP_CAP - 1;
        newLevel = FREE_LEVEL_CAP;
        await tx.user.update({
          where: { id: userId },
          data: { xp: newXp, level: newLevel },
        });
      } else if (newLevel !== previousLevel) {
        await tx.user.update({
          where: { id: userId },
          data: { level: newLevel },
        });
      }

      const didLevelUp = !hitFreeLimit && newLevel > previousLevel;
      const actualEarnedXp = hitFreeLimit
        ? Math.max(0, (FREE_XP_CAP - 1) - (updatedUser.xp - earnedXp))
        : earnedXp;

      return {
        attempt: createdAttempt,
        earnedXp: actualEarnedXp,
        newXp,
        previousLevel,
        newLevel,
        didLevelUp,
        hitFreeLimit,
      };
    });

    return NextResponse.json(
      {
        success: true,
        attemptId: result.attempt.id,
        score,
        correctAnswers,
        totalQuestions,
        earnedXp: result.earnedXp,
        newXp: result.newXp,
        previousLevel: result.previousLevel,
        newLevel: result.newLevel,
        didLevelUp: result.didLevelUp,
        hitFreeLimit: result.hitFreeLimit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/quiz/submit error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid data",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}