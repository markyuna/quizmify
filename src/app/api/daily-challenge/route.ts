import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getOrCreateTodaysChallenge, getDailyChallengeStats } from "@/lib/dailyChallenge";
import { getRequestLocale } from "@/i18n/get-locale";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locale = await getRequestLocale();
  const challenge = await getOrCreateTodaysChallenge(locale);

  const [existingAttempt, stats] = await Promise.all([
    prisma.dailyChallengeAttempt.findUnique({
      where: {
        dailyChallengeId_userId: {
          dailyChallengeId: challenge.id,
          userId: session.user.id,
        },
      },
    }),
    getDailyChallengeStats(challenge.id),
  ]);

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      date: challenge.date,
      topic: challenge.topic,
      difficulty: challenge.difficulty,
      questions: challenge.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        // Never send the answer key until the user has already attempted --
        // the play flow should only learn correctness via the submit route.
        ...(existingAttempt ? { answer: q.answer, explanation: q.explanation } : {}),
      })),
    },
    attempted: existingAttempt !== null,
    result: existingAttempt
      ? {
          score: existingAttempt.score,
          correctAnswers: existingAttempt.correctAnswers,
          totalQuestions: existingAttempt.totalQuestions,
          earnedXp: existingAttempt.earnedXp,
          baseXp: existingAttempt.baseXp,
          aboveAverageBonusXp: existingAttempt.aboveAverageBonusXp,
        }
      : null,
    stats,
  });
}
