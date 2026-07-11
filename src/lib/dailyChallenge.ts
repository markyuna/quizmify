import { prisma } from "@/lib/db";
import { isGeographyTopic } from "@/lib/geography";
import {
  generateQuestionsWithAI,
  dedupeQuestions,
  type Difficulty,
} from "@/lib/questionGeneration";
import type { Locale } from "@/i18n/locales";

export const DAILY_CHALLENGE_QUESTION_COUNT = 8;
const DAILY_CHALLENGE_DIFFICULTY: Difficulty = "medium";

// A small curated rotation so every user gets the same topic on the same
// day without needing real randomness (which wouldn't be reproducible if
// two requests raced to create today's challenge).
const DAILY_CHALLENGE_TOPICS = [
  "World History",
  "Space Exploration",
  "Classic Literature",
  "Human Biology",
  "World Geography",
  "Computer Science",
  "Art History",
  "Music Theory",
  "Ancient Civilizations",
  "Physics",
  "Mythology",
  "World Cuisine",
] as const;

/** UTC calendar day as "YYYY-MM-DD", used as the unique key for the day. */
export function getTodayDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function pickTopicForDate(dateKey: string): string {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return DAILY_CHALLENGE_TOPICS[hash % DAILY_CHALLENGE_TOPICS.length];
}

/**
 * Returns today's shared daily challenge *for the given language*,
 * generating and persisting it on first access if it doesn't exist yet.
 * Every user who plays in the same language sees the same challenge and is
 * ranked against each other; each language gets its own independently
 * generated set of questions (translation of a single generation isn't
 * worth the added complexity here). Safe under concurrent requests: if two
 * requests race to create the same (date, language) challenge, the loser's
 * insert fails on the unique constraint and it just re-fetches the
 * winner's row instead of erroring.
 */
export async function getOrCreateTodaysChallenge(language: Locale, now: Date = new Date()) {
  const dateKey = getTodayDateKey(now);
  const where = { date_language: { date: dateKey, language } };

  const existing = await prisma.dailyChallenge.findUnique({
    where,
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });

  if (existing) return existing;

  const topic = pickTopicForDate(dateKey);
  const isGeography = isGeographyTopic(topic);

  const generated = dedupeQuestions(
    await generateQuestionsWithAI({
      topic,
      difficulty: DAILY_CHALLENGE_DIFFICULTY,
      language,
      amount: DAILY_CHALLENGE_QUESTION_COUNT,
      isGeography,
    })
  ).slice(0, DAILY_CHALLENGE_QUESTION_COUNT);

  try {
    return await prisma.dailyChallenge.create({
      data: {
        date: dateKey,
        topic,
        difficulty: DAILY_CHALLENGE_DIFFICULTY,
        language,
        questions: {
          create: generated.map((q, index) => ({
            question: q.question,
            answer: q.correct_answer,
            options: q.options,
            explanation: q.explanation,
            orderIndex: index,
          })),
        },
      },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
  } catch {
    // Another request created it first -- fetch the winner's row.
    const winner = await prisma.dailyChallenge.findUnique({
      where,
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });

    if (!winner) throw new Error("Failed to create or fetch today's daily challenge");
    return winner;
  }
}

export async function getDailyChallengeStats(dailyChallengeId: string) {
  const aggregate = await prisma.dailyChallengeAttempt.aggregate({
    where: { dailyChallengeId },
    _avg: { score: true },
    _count: { _all: true },
  });

  return {
    averageScore: Math.round(aggregate._avg.score ?? 0),
    participantCount: aggregate._count._all,
  };
}
