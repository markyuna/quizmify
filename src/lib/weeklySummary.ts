import { prisma } from "@/lib/db";
import { getEffectiveStreak } from "@/lib/streak";
import type { WeeklySummaryTopicAccuracy } from "@/emails/WeeklySummaryEmail";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_TOPICS_SHOWN = 5;

export type WeeklySummaryData = {
  quizzesPlayed: number;
  currentStreak: number;
  longestStreakThisMonth: number;
  topicAccuracies: WeeklySummaryTopicAccuracy[];
};

function accuracyByTopic(attempts: { correctAnswers: number; totalQuestions: number; topic: string }[]) {
  const byTopic = new Map<string, { correct: number; total: number; count: number }>();

  for (const a of attempts) {
    const entry = byTopic.get(a.topic) ?? { correct: 0, total: 0, count: 0 };
    entry.correct += a.correctAnswers;
    entry.total += a.totalQuestions;
    entry.count += 1;
    byTopic.set(a.topic, entry);
  }

  return byTopic;
}

/**
 * Builds the data for one user's weekly summary email: quizzes played,
 * per-topic accuracy this week vs the week before (when available), and
 * streak info. `longestStreakThisMonth` is approximated from the stored
 * all-time longestStreak, since we don't keep a month-scoped history --
 * good enough for a "here's how you did" nudge, not a precise ledger.
 */
export async function buildWeeklySummary(userId: string, now: Date = new Date()): Promise<WeeklySummaryData> {
  const weekAgo = new Date(now.getTime() - 7 * MS_PER_DAY);
  const twoWeeksAgo = new Date(now.getTime() - 14 * MS_PER_DAY);

  const [thisWeekAttempts, lastWeekAttempts, user] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId, createdAt: { gte: weekAgo, lt: now } },
      select: { correctAnswers: true, totalQuestions: true, game: { select: { topic: true } } },
    }),
    prisma.attempt.findMany({
      where: { userId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
      select: { correctAnswers: true, totalQuestions: true, game: { select: { topic: true } } },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true, lastQuizDate: true },
    }),
  ]);

  const thisWeekByTopic = accuracyByTopic(
    thisWeekAttempts.map((a) => ({ ...a, topic: a.game.topic }))
  );
  const lastWeekByTopic = accuracyByTopic(
    lastWeekAttempts.map((a) => ({ ...a, topic: a.game.topic }))
  );

  const topicAccuracies: WeeklySummaryTopicAccuracy[] = Array.from(thisWeekByTopic.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_TOPICS_SHOWN)
    .map(([topic, stats]) => {
      const previous = lastWeekByTopic.get(topic);
      return {
        topic,
        accuracyPercent: Math.round((stats.correct / stats.total) * 100),
        previousAccuracyPercent:
          previous && previous.total > 0 ? Math.round((previous.correct / previous.total) * 100) : null,
      };
    });

  return {
    quizzesPlayed: thisWeekAttempts.length,
    currentStreak: getEffectiveStreak(user, now),
    longestStreakThisMonth: user.longestStreak,
    topicAccuracies,
  };
}
