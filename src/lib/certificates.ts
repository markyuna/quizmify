import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { CertificateKind } from "@/generated/prisma/client";

/** Minimum quizzes in a topic before "category mastery" can be considered. */
const CATEGORY_MASTERY_MIN_QUIZZES = 10;
const CATEGORY_MASTERY_MIN_ACCURACY = 0.9;
const QUIZZES_MILESTONE = 50;
const STREAK_MILESTONE_DAYS = 7;

export const CERTIFICATE_INFO: Record<
  CertificateKind,
  { title: string; description: (topic: string) => string }
> = {
  quizzes_50: {
    title: "50 Quizzes Completed",
    description: () => `Awarded for completing ${QUIZZES_MILESTONE} quizzes on Quizmify.`,
  },
  category_mastery: {
    title: "Category Mastery",
    description: (topic) =>
      `Awarded for reaching ${Math.round(CATEGORY_MASTERY_MIN_ACCURACY * 100)}%+ accuracy in "${topic}" across at least ${CATEGORY_MASTERY_MIN_QUIZZES} quizzes.`,
  },
  streak_7: {
    title: "7-Day Streak",
    description: () => `Awarded for playing Quizmify ${STREAK_MILESTONE_DAYS} days in a row.`,
  },
};

/**
 * Checks the milestones we can award from data that just changed after a
 * quiz submission, and creates any newly-earned Certificate rows. Idempotent
 * via the @@unique([userId, kind, topic]) constraint -- call this every
 * submit and it's a no-op once a milestone is already recorded.
 *
 * Only checks the topic just played (not every topic the user has ever
 * touched) to keep this cheap enough to run inside the submit transaction.
 */
export async function checkAndAwardCertificates(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  context: { topic: string; currentStreak: number }
): Promise<void> {
  const candidates: Array<{ kind: CertificateKind; topic: string; metadata?: Prisma.InputJsonValue }> = [];

  const completedGames = await tx.game.count({
    where: { userId, timeEnded: { not: null } },
  });

  if (completedGames >= QUIZZES_MILESTONE) {
    candidates.push({ kind: "quizzes_50", topic: "", metadata: { quizCount: completedGames } });
  }

  if (context.currentStreak >= STREAK_MILESTONE_DAYS) {
    candidates.push({ kind: "streak_7", topic: "", metadata: { streak: context.currentStreak } });
  }

  if (context.topic) {
    const topicAttempts = await tx.attempt.findMany({
      where: { userId, game: { topic: context.topic } },
      select: { correctAnswers: true, totalQuestions: true },
    });

    if (topicAttempts.length >= CATEGORY_MASTERY_MIN_QUIZZES) {
      const totalCorrect = topicAttempts.reduce((sum, a) => sum + a.correctAnswers, 0);
      const totalQuestions = topicAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
      const accuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

      if (accuracy >= CATEGORY_MASTERY_MIN_ACCURACY) {
        candidates.push({
          kind: "category_mastery",
          topic: context.topic,
          metadata: { accuracy, quizCount: topicAttempts.length },
        });
      }
    }
  }

  if (candidates.length === 0) return;

  const existing = await tx.certificate.findMany({
    where: { userId, OR: candidates.map((c) => ({ kind: c.kind, topic: c.topic })) },
    select: { kind: true, topic: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.kind}:${e.topic}`));

  const toCreate = candidates.filter((c) => !existingKeys.has(`${c.kind}:${c.topic}`));
  if (toCreate.length === 0) return;

  await tx.certificate.createMany({
    data: toCreate.map((c) => ({ userId, kind: c.kind, topic: c.topic, metadata: c.metadata })),
  });
}
