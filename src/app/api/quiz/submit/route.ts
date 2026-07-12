import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { calculateEarnedXp, calculateLevel, calculateSpeedBonusXp } from "@/lib/xp";
import { FREE_XP_CAP, FREE_LEVEL_CAP } from "@/lib/stripe";
import { registerQuizActivity, getEffectiveStreak, type StreakResult } from "@/lib/streak";
import { checkAndAwardCertificates } from "@/lib/certificates";
import { isEffectivelyPro } from "@/lib/paywall";
import { submitQuizSchema } from "@/schemas/form/quiz";

export type TrophyReason = "perfect" | "streak" | null;

function computeTrophyReason(score: number, streak: StreakResult): TrophyReason {
  if (score === 100) return "perfect";
  // A brand new account's very first quiz trivially "beats" a longestStreak
  // of 0 -- require at least a 2-day streak before calling it a record.
  if (streak.isNewRecord && streak.currentStreak >= 2) return "streak";
  return null;
}

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
        select: { xp: true, level: true, currentStreak: true, lastQuizDate: true },
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
          speedBonusXp: 0,
          newXp: currentUser?.xp ?? 0,
          newLevel: level,
          previousLevel: level,
          didLevelUp: false,
          currentStreak: currentUser ? getEffectiveStreak(currentUser) : 0,
          streakExtended: false,
          streakProtected: false,
          trophyReason: null satisfies TrophyReason,
        },
        { status: 200 }
      );
    }

    const questionMap = new Map(
      game.questions.map((question) => [question.id, question])
    );

    const uniqueAnswersMap = new Map<string, { selectedAnswer: string; responseTimeMs: number | null }>();

    for (const answer of parsedBody.answers) {
      if (!uniqueAnswersMap.has(answer.questionId)) {
        uniqueAnswersMap.set(answer.questionId, {
          selectedAnswer: answer.selectedAnswer.trim(),
          responseTimeMs: answer.responseTimeMs ?? null,
        });
      }
    }

    let correctAnswers = 0;

    const answersToCreate = Array.from(uniqueAnswersMap.entries())
      .map(([questionId, { selectedAnswer, responseTimeMs }]) => {
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
          responseTimeMs,
        };
      })
      .filter(
        (
          answer
        ): answer is {
          questionId: string;
          selectedAnswer: string;
          isCorrect: boolean;
          responseTimeMs: number | null;
        } => answer !== null
      );

    const totalQuestions = game.questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    const safeTimeSpent = Math.max(
      0,
      Math.min(parsedBody.timeSpent, 60 * 60 * 3)
    );

    const timeLimitMs =
      game.isTimed && game.timePerQuestionSec ? game.timePerQuestionSec * 1000 : 0;

    const speedBonusXp = calculateSpeedBonusXp({
      answers: answersToCreate,
      timeLimitMs,
    });

    const earnedXp =
      calculateEarnedXp({
        correctAnswers,
        totalQuestions,
      }) + speedBonusXp;

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
        select: { level: true, subscriptionStatus: true, premiumUntil: true, freeTrialUsedAt: true },
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
          trialAvailable: false,
          streak: {
            currentStreak: 0,
            longestStreak: 0,
            isNewRecord: false,
            streakExtended: false,
            streakProtected: false,
            streakReset: false,
            protectionsRemaining: 0,
          } satisfies StreakResult,
          trophyReason: null satisfies TrophyReason,
        };
      }

      const streak = await registerQuizActivity(tx, userId);
      const trophyReason = computeTrophyReason(score, streak);

      await checkAndAwardCertificates(tx, userId, {
        topic: game.topic,
        currentStreak: streak.currentStreak,
      });

      if (trophyReason) {
        await tx.trophy.create({
          data: {
            userId,
            gameId: game.id,
            kind: trophyReason,
            streakCount: trophyReason === "streak" ? streak.currentStreak : null,
          },
        });
      }

      const previousLevel = previousUser.level;
      const isPro = isEffectivelyPro(previousUser);

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: earnedXp } },
        select: { xp: true },
      });

      let newXp = updatedUser.xp;
      let newLevel = calculateLevel(newXp);
      const hitFreeLimit = !isPro && newXp >= FREE_XP_CAP;

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

      return {
        attempt: createdAttempt,
        earnedXp: hitFreeLimit ? Math.max(0, FREE_XP_CAP - 1 - (newXp - earnedXp)) : earnedXp,
        newXp,
        previousLevel,
        newLevel,
        didLevelUp,
        hitFreeLimit,
        trialAvailable: hitFreeLimit && !previousUser.freeTrialUsedAt,
        streak,
        trophyReason,
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
        speedBonusXp,
        newXp: result.newXp,
        previousLevel: result.previousLevel,
        newLevel: result.newLevel,
        didLevelUp: result.didLevelUp,
        hitFreeLimit: result.hitFreeLimit,
        trialAvailable: result.trialAvailable,
        currentStreak: result.streak.currentStreak,
        streakExtended: result.streak.streakExtended,
        streakProtected: result.streak.streakProtected,
        trophyReason: result.trophyReason,
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