import { z } from "zod";

import { prisma } from "@/lib/db";
import { openai } from "@/lib/openai";

/** Regenerate the cached recommendation at most once a day... */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
/** ...or after this many newly-completed quizzes, whichever comes first. */
const REGENERATE_AFTER_NEW_QUIZZES = 3;

/** A topic needs at least this many attempts before its accuracy counts. */
const MIN_ATTEMPTS_PER_TOPIC = 3;
/** Below this many completed quizzes overall there isn't enough signal yet. */
const MIN_TOTAL_QUIZZES = 5;

const EXCLUDED_TOPICS = new Set(["Practice Mistakes"]);

export type TopicRecommendationResult = {
  topic: string;
  message: string;
  accuracy: number;
};

const recommendationResponseSchema = z.object({
  message: z.string().min(1).max(300),
});

function isStale(generatedAt: Date, quizCountAtGeneration: number, currentQuizCount: number, now: Date): boolean {
  const ageMs = now.getTime() - generatedAt.getTime();
  return (
    ageMs >= STALE_AFTER_MS ||
    currentQuizCount - quizCountAtGeneration >= REGENERATE_AFTER_NEW_QUIZZES
  );
}

async function findWeakestTopic(userId: string): Promise<{ topic: string; accuracy: number } | null> {
  const attempts = await prisma.attempt.findMany({
    where: { userId },
    select: {
      correctAnswers: true,
      totalQuestions: true,
      game: { select: { topic: true } },
    },
  });

  const byTopic = new Map<string, { correct: number; total: number; quizzes: number }>();

  for (const attempt of attempts) {
    const topic = attempt.game.topic;
    if (EXCLUDED_TOPICS.has(topic)) continue;

    const entry = byTopic.get(topic) ?? { correct: 0, total: 0, quizzes: 0 };
    entry.correct += attempt.correctAnswers;
    entry.total += attempt.totalQuestions;
    entry.quizzes += 1;
    byTopic.set(topic, entry);
  }

  let weakest: { topic: string; accuracy: number } | null = null;

  for (const [topic, entry] of byTopic) {
    if (entry.quizzes < MIN_ATTEMPTS_PER_TOPIC || entry.total === 0) continue;

    const accuracy = entry.correct / entry.total;
    if (!weakest || accuracy < weakest.accuracy) {
      weakest = { topic, accuracy };
    }
  }

  return weakest;
}

async function generateMotivationalMessage(topic: string, accuracyPercent: number): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "You are an encouraging quiz coach. Given a topic the user is weakest in, write one short, upbeat, motivating sentence (max 160 characters) suggesting they practice it. No emojis, no markdown. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Topic: "${topic}". Current accuracy in this topic: ${accuracyPercent}%. Return JSON: {"message": "string"}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");

  const parsed = recommendationResponseSchema.parse(JSON.parse(content));
  return parsed.message.trim();
}

/**
 * Returns a cached "practice this topic" recommendation, regenerating it
 * with a cheap OpenAI call only when the cache is missing, stale (>24h), or
 * the user has completed several new quizzes since it was last generated --
 * never on every dashboard load, to keep this feature's AI cost bounded.
 */
export async function getOrGenerateTopicRecommendation(
  userId: string
): Promise<TopicRecommendationResult | null> {
  const now = new Date();

  const [cached, totalQuizzes] = await Promise.all([
    prisma.topicRecommendation.findUnique({ where: { userId } }),
    prisma.game.count({ where: { userId, timeEnded: { not: null } } }),
  ]);

  if (totalQuizzes < MIN_TOTAL_QUIZZES) {
    return null;
  }

  if (cached && !isStale(cached.generatedAt, cached.quizCountAtGeneration, totalQuizzes, now)) {
    return { topic: cached.topic, message: cached.message, accuracy: cached.accuracy };
  }

  const weakest = await findWeakestTopic(userId);

  if (!weakest) {
    return cached
      ? { topic: cached.topic, message: cached.message, accuracy: cached.accuracy }
      : null;
  }

  const accuracyPercent = Math.round(weakest.accuracy * 100);

  let message: string;
  try {
    message = await generateMotivationalMessage(weakest.topic, accuracyPercent);
  } catch (error) {
    console.error("Topic recommendation generation failed:", error);
    // Fall back to the previous cached message rather than a hard failure
    // if we already had one; otherwise a plain non-AI message.
    if (cached) return { topic: cached.topic, message: cached.message, accuracy: cached.accuracy };
    message = `Your accuracy in ${weakest.topic} is ${accuracyPercent}%. A quick practice round could help.`;
  }

  await prisma.topicRecommendation.upsert({
    where: { userId },
    create: {
      userId,
      topic: weakest.topic,
      message,
      accuracy: weakest.accuracy,
      quizCountAtGeneration: totalQuizzes,
    },
    update: {
      topic: weakest.topic,
      message,
      accuracy: weakest.accuracy,
      quizCountAtGeneration: totalQuizzes,
      generatedAt: now,
    },
  });

  return { topic: weakest.topic, message, accuracy: weakest.accuracy };
}
