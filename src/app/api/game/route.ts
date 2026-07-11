import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { quizCreationSchema } from "@/schemas/form/quiz";
import { getRequestLocale } from "@/i18n/get-locale";
import type { Locale } from "@/i18n/locales";
import { isUserAtFreeLimit } from "@/lib/paywall";
import { isGeographyTopic } from "@/lib/geography";
import { TIMED_MODE_SECONDS_PER_QUESTION } from "@/lib/timedMode";
import {
  type Difficulty,
  type GeneratedQuestion,
  normalizeTopic,
  normalizeDifficulty,
  dedupeQuestions,
  generateQuestionsWithAI,
  shuffleArray,
} from "@/lib/questionGeneration";

type SupabaseMCQQuestion = {
  id: string;
  topic: string;
  difficulty: Difficulty;
  language: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  country: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
};

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

async function fetchExistingMCQQuestions(params: {
  topic: string;
  difficulty: Difficulty;
  language: Locale;
  amount: number;
}): Promise<SupabaseMCQQuestion[]> {
  const { topic, difficulty, language, amount } = params;

  const { data, error } = await supabaseAdmin
    .from("mcq_questions")
    .select("*")
    .ilike("topic", topic)
    .eq("difficulty", difficulty)
    .eq("language", language)
    .eq("is_active", true)
    .order("usage_count", { ascending: true })
    .limit(amount);

  if (error) {
    throw new Error(`Supabase fetch error: ${error.message}`);
  }

  return (data ?? []) as SupabaseMCQQuestion[];
}

async function saveGeneratedQuestionsToSupabase(params: {
  topic: string;
  difficulty: Difficulty;
  language: Locale;
  questions: GeneratedQuestion[];
}) {
  const { topic, difficulty, language, questions } = params;

  if (questions.length === 0) return;

  const rows = questions.map((q) => ({
    id: randomUUID(),
    topic,
    difficulty,
    language,
    question: q.question,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    country: q.country,
    is_active: true,
    usage_count: 0,
  }));

  const { error } = await supabaseAdmin.from("mcq_questions").insert(rows);

  if (error) {
    throw new Error(`Supabase insert error: ${error.message}`);
  }
}

async function incrementUsageCount(questions: SupabaseMCQQuestion[]) {
  const updates = questions.map((question) =>
    supabaseAdmin
      .from("mcq_questions")
      .update({ usage_count: question.usage_count + 1 })
      .eq("id", question.id)
  );

  await Promise.allSettled(updates);
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }

    if (await isUserAtFreeLimit(session.user.id)) {
      return jsonError("FREE_LIMIT_REACHED", 403);
    }

    const body = await req.json();
    const parsedBody = quizCreationSchema.parse(body);

    const topic = normalizeTopic(parsedBody.topic);
    const amount = parsedBody.amount;
    const difficulty = normalizeDifficulty(parsedBody.difficulty);
    const type = parsedBody.type;
    const language = await getRequestLocale();
    const isGeography = isGeographyTopic(topic);
    const isTimed = parsedBody.isTimed;

    // A cache that only ever holds exactly `amount` rows for a given
    // topic/difficulty/language would serve the *identical* set on every
    // quiz forever -- nothing below would ever trigger new generation once
    // the cache already covered `amount`. Pull a pool a few times larger
    // than one quiz so there's always something to shuffle, and let it grow
    // by one more `amount`-sized AI batch per visit (same cost profile as a
    // cold cache) until it reaches that size.
    const POOL_TARGET = amount * 3;

    let cachedQuestions: SupabaseMCQQuestion[] = [];

    try {
      cachedQuestions = await fetchExistingMCQQuestions({
        topic,
        difficulty,
        language,
        amount: POOL_TARGET,
      });

    } catch (error) {
      console.error("Supabase cache read error:", error);
      cachedQuestions = [];
    }

    let pool: Array<SupabaseMCQQuestion | GeneratedQuestion> = [
      ...cachedQuestions,
    ];

    if (pool.length < POOL_TARGET) {
      const aiQuestions = await generateQuestionsWithAI({
        topic,
        difficulty,
        language,
        amount,
        isGeography,
      });

      const dedupedAIQuestions = dedupeQuestions(aiQuestions).slice(0, amount);

      if (dedupedAIQuestions.length > 0) {
        try {
          await saveGeneratedQuestionsToSupabase({
            topic,
            difficulty,
            language,
            questions: dedupedAIQuestions,
          });

        } catch (error) {
          console.error("Supabase cache write error:", error);
        }

        pool = dedupeQuestions([...pool, ...dedupedAIQuestions]);
      }
    }

    // Randomize which `amount` questions are served this time instead of
    // always taking the same prefix of the pool.
    const finalQuestions = shuffleArray(dedupeQuestions(pool)).slice(0, amount);

    if (finalQuestions.length === 0) {
      return jsonError("Could not fetch or generate questions.", 500);
    }

    const game = await prisma.$transaction(async (tx) => {
      const createdGame = await tx.game.create({
        data: {
          gameType: "mcq",
          timeStarted: new Date(),
          userId: session.user.id,
          topic,
          difficulty,
          language,
          isTimed,
          timePerQuestionSec: isTimed ? TIMED_MODE_SECONDS_PER_QUESTION : null,
        },
      });

      await tx.question.createMany({
        data: finalQuestions.map((question) => ({
          question: question.question,
          answer: question.correct_answer,
          options: question.options,
          explanation:
            "explanation" in question && question.explanation
              ? question.explanation
              : null,
          country: question.country ?? null,
          gameId: createdGame.id,
          questionType: "mcq",
        })),
      });

      return createdGame;
    });

    await incrementUsageCount(
      finalQuestions.filter(
        (q): q is SupabaseMCQQuestion => "id" in q && typeof q.id === "string"
      )
    );

    return NextResponse.json(
      {
        success: true,
        gameId: game.id,
        source:
          cachedQuestions.length >= POOL_TARGET
            ? "supabase_cache"
            : cachedQuestions.length > 0
            ? "supabase_plus_ai"
            : "ai",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/game error:", error);

    if (error instanceof z.ZodError) {
      return jsonError("Invalid data", 400, error.flatten());
    }

    if (error instanceof Error) {
      return jsonError("Internal server error", 500, {
        message: error.message,
      });
    }

    return jsonError("Internal server error", 500);
  }
}