import { randomUUID } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  type Difficulty,
  type GeneratedQuestion,
  dedupeQuestions,
  generateQuestionsWithAI,
  shuffleArray,
} from "@/lib/questionGeneration";
import type { Locale } from "@/i18n/locales";

export type SupabaseMCQQuestion = {
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

export type SourcedQuestion = SupabaseMCQQuestion | GeneratedQuestion;

async function fetchExistingMCQQuestions(params: {
  topic: string;
  difficulty: Difficulty;
  language: Locale;
  amount: number;
}): Promise<SupabaseMCQQuestion[]> {
  const { topic, difficulty, language, amount } = params;

  // Fetch extra headroom: historical cache rows may contain duplicate
  // question texts (pre-dedupe-fix inserts), so `amount` raw rows can
  // collapse into far fewer unique questions.
  const { data, error } = await supabaseAdmin
    .from("mcq_questions")
    .select("*")
    .ilike("topic", topic)
    .eq("difficulty", difficulty)
    .eq("language", language)
    .eq("is_active", true)
    .order("usage_count", { ascending: true })
    .limit(amount * 2);

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

export async function incrementUsageCount(questions: SourcedQuestion[]) {
  const supabaseOrigin = questions.filter(
    (q): q is SupabaseMCQQuestion => "id" in q && typeof q.id === "string"
  );

  const updates = supabaseOrigin.map((question) =>
    supabaseAdmin
      .from("mcq_questions")
      .update({ usage_count: question.usage_count + 1 })
      .eq("id", question.id)
  );

  await Promise.allSettled(updates);
}

/**
 * Shared question-sourcing pipeline: Supabase cache first, top up with AI
 * generation when the pool is thin, shuffle, slice to `amount`. Used by
 * both /api/game (first batch) and /api/game/[gameId]/next-batch (the
 * adaptive-difficulty second batch), so both draw from the exact same
 * cache-growth and randomization behavior -- see the POOL_TARGET comment
 * for why a naive "just fetch `amount`" cache read would go stale.
 */
export async function sourceQuestions(params: {
  topic: string;
  difficulty: Difficulty;
  language: Locale;
  amount: number;
  isGeography: boolean;
}): Promise<{ questions: SourcedQuestion[]; cachedCount: number; poolTarget: number }> {
  const { topic, difficulty, language, amount, isGeography } = params;

  // A cache that only ever holds exactly `amount` rows for a given
  // topic/difficulty/language would serve the *identical* set on every
  // quiz forever -- nothing below would ever trigger new generation once
  // the cache already covered `amount`. Pull a pool a few times larger
  // than one quiz so there's always something to shuffle, and let it grow
  // by one more `amount`-sized AI batch per visit (same cost profile as a
  // cold cache) until it reaches that size.
  const poolTarget = amount * 3;

  let cachedQuestions: SupabaseMCQQuestion[] = [];

  try {
    cachedQuestions = await fetchExistingMCQQuestions({
      topic,
      difficulty,
      language,
      amount: poolTarget,
    });
  } catch (error) {
    console.error("Supabase cache read error:", error);
    cachedQuestions = [];
  }

  // Measure the pool in UNIQUE questions, not raw rows. Counting rows let
  // duplicate cache entries satisfy `poolTarget` and permanently shut off
  // new generation while the deduped serve-set stayed tiny -- the classic
  // "same questions every quiz" bug.
  let pool: SourcedQuestion[] = dedupeQuestions(cachedQuestions);

  if (pool.length < poolTarget) {
    const aiQuestions = await generateQuestionsWithAI({
      topic,
      difficulty,
      language,
      amount,
      isGeography,
      existingQuestions: pool.map((q) => q.question),
    });

    // Drop AI questions that already exist in the cache BEFORE saving, so
    // duplicates never get persisted as new rows.
    const existingKeys = new Set(pool.map((q) => q.question.trim().toLowerCase()));
    const newAIQuestions = dedupeQuestions(aiQuestions)
      .filter((q) => !existingKeys.has(q.question.trim().toLowerCase()))
      .slice(0, amount);

    if (newAIQuestions.length > 0) {
      try {
        await saveGeneratedQuestionsToSupabase({ topic, difficulty, language, questions: newAIQuestions });
      } catch (error) {
        console.error("Supabase cache write error:", error);
      }

      pool = [...pool, ...newAIQuestions];
    }
  }

  // Randomize which `amount` questions are served this time instead of
  // always taking the same prefix of the pool.
  const questions = shuffleArray(pool).slice(0, amount);

  return { questions, cachedCount: cachedQuestions.length, poolTarget };
}
