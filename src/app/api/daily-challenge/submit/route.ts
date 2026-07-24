import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getDailyChallengeStats } from "@/lib/dailyChallenge";
import { submitDailyChallengeSchema } from "@/schemas/form/dailyChallenge";
import { calculateDailyChallengeXp, calculateLevel } from "@/lib/xp";
import { FREE_XP_CAP, FREE_LEVEL_CAP } from "@/lib/stripe";
import { isEffectivelyPro } from "@/lib/paywall";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const parsedBody = submitDailyChallengeSchema.parse(body);

    const challenge = await prisma.dailyChallenge.findUnique({
      where: { id: parsedBody.dailyChallengeId },
      include: { questions: true },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Daily challenge not found" }, { status: 404 });
    }

    const existingAttempt = await prisma.dailyChallengeAttempt.findUnique({
      where: {
        dailyChallengeId_userId: { dailyChallengeId: challenge.id, userId },
      },
    });

    if (existingAttempt) {
      const stats = await getDailyChallengeStats(challenge.id);
      return NextResponse.json({
        success: true,
        score: existingAttempt.score,
        correctAnswers: existingAttempt.correctAnswers,
        totalQuestions: existingAttempt.totalQuestions,
        stats,
        // Already granted on the original submit -- reported here for
        // display only, not re-applied to the user's XP.
        earnedXp: existingAttempt.earnedXp,
        baseXp: existingAttempt.baseXp,
        aboveAverageBonusXp: existingAttempt.aboveAverageBonusXp,
      });
    }

    const questionMap = new Map(challenge.questions.map((q) => [q.id, q]));
    const uniqueAnswers = new Map<string, string>();

    for (const answer of parsedBody.answers) {
      if (!uniqueAnswers.has(answer.questionId)) {
        uniqueAnswers.set(answer.questionId, answer.selectedAnswer.trim());
      }
    }

    let correctAnswers = 0;

    for (const [questionId, selectedAnswer] of uniqueAnswers) {
      const question = questionMap.get(questionId);
      if (!question) continue;

      if (question.answer.trim().toLowerCase() === selectedAnswer.toLowerCase()) {
        correctAnswers += 1;
      }
    }

    const totalQuestions = challenge.questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const safeTimeSpent = Math.max(0, Math.min(parsedBody.timeSpent, 60 * 60));

    // Snapshot the average *before* this attempt is recorded, and lock the
    // above-average bonus decision to that snapshot -- later attempts
    // shifting the average must not retroactively revoke XP already paid out.
    const statsBeforeAttempt = await getDailyChallengeStats(challenge.id);

    const xp = calculateDailyChallengeXp({
      correctAnswers,
      totalQuestions,
      score,
      averageScoreBeforeAttempt: statsBeforeAttempt.averageScore,
      participantCountBeforeAttempt: statsBeforeAttempt.participantCount,
    });

    // The unique([dailyChallengeId, userId]) constraint is the real guard
    // against double submissions; the existingAttempt check above is just
    // the fast path so most requests never hit a constraint violation.
    const result = await prisma.$transaction(async (tx) => {
      await tx.dailyChallengeAttempt.create({
        data: {
          dailyChallengeId: challenge.id,
          userId,
          score,
          correctAnswers,
          totalQuestions,
          timeSpent: safeTimeSpent,
          baseXp: xp.baseXp,
          aboveAverageBonusXp: xp.aboveAverageBonusXp,
          earnedXp: xp.totalXp,
        },
      });

      const previousUser = await tx.user.findUnique({
        where: { id: userId },
        select: { level: true, subscriptionStatus: true, premiumUntil: true },
      });

      if (!previousUser) {
        return { earnedXp: 0, newXp: 0, previousLevel: 1, newLevel: 1, didLevelUp: false, hitFreeLimit: false };
      }

      const previousLevel = previousUser.level;
      const isPro = isEffectivelyPro(previousUser);

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: xp.totalXp } },
        select: { xp: true },
      });

      // Mirrors /api/quiz/submit: xp keeps accumulating permanently, only
      // the level is capped for free users, so progress earned during a
      // Pro window survives a lapse. See src/lib/pro.ts.
      const newXp = updatedUser.xp;
      const trueLevel = calculateLevel(newXp);
      const hitFreeLimit = !isPro && newXp >= FREE_XP_CAP;
      const newLevel = isPro ? trueLevel : Math.min(trueLevel, FREE_LEVEL_CAP);

      if (newLevel !== previousLevel) {
        await tx.user.update({
          where: { id: userId },
          data: { level: newLevel },
        });
      }

      const didLevelUp = newLevel > previousLevel;

      return {
        earnedXp: xp.totalXp,
        newXp,
        previousLevel,
        newLevel,
        didLevelUp,
        hitFreeLimit,
      };
    });

    const stats = await getDailyChallengeStats(challenge.id);

    return NextResponse.json({
      success: true,
      score,
      correctAnswers,
      totalQuestions,
      stats,
      earnedXp: result.earnedXp,
      baseXp: xp.baseXp,
      aboveAverageBonusXp: xp.aboveAverageBonusXp,
      newXp: result.newXp,
      previousLevel: result.previousLevel,
      newLevel: result.newLevel,
      didLevelUp: result.didLevelUp,
      hitFreeLimit: result.hitFreeLimit,
    });
  } catch (error) {
    console.error("POST /api/daily-challenge/submit error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.flatten() },
        { status: 400 }
      );
    }

    // A unique-constraint race (two simultaneous submits from the same
    // user) lands here -- treat it the same as the existingAttempt path.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Daily challenge already submitted" },
        { status: 409 }
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
