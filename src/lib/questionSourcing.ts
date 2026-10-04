import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
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
  //
  // NOTE: this cache is keyed by topic+difficulty+language only -- it has
  // no notion of the parent category that generateQuestionsWithAI's
  // categoryName scope constraint (see /api/game route.ts) was generated
  // under. Fine today, since a given topic string only ever gets created
  // under one category in practice. If the same topic name is ever created
  // under two different categories (e.g. "Fleuves" under both "La France"
  // and "Geographie"), this read would serve either category's cached rows
  // to the other, regardless of which category's scope they were actually
  // generated for -- revisit by keying the cache on categorySlug too if
  // that scenario becomes real.
  const { data, error } = await getSupabaseAdmin()
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
}): Promise<string[]> {
  const { topic, difficulty, language, questions } = params;

  if (questions.length === 0) return [];

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

  const { error } = await getSupabaseAdmin().from("mcq_questions").insert(rows);

  if (error) {
    throw new Error(`Supabase insert error: ${error.message}`);
  }

  return rows.map((row) => row.id);
}

export async function incrementUsageCount(questions: SourcedQuestion[]) {
  const supabaseOrigin = questions.filter(
    (q): q is SupabaseMCQQuestion => "id" in q && typeof q.id === "string"
  );

  const updates = supabaseOrigin.map((question) =>
    getSupabaseAdmin()
      .from("mcq_questions")
      .update({ usage_count: question.usage_count + 1 })
      .eq("id", question.id)
  );

  await Promise.allSettled(updates);
}

/**
 * Deactivates cache rows by id -- used when a request that generated new
 * questions (via sourceQuestions) fails before a Game ever gets created for
 * them, e.g. Puzzle Mode image generation or the Game/Question DB write
 * itself. Only ever pass newlyCreatedIds from sourceQuestions()'s result,
 * never ids of reused/pre-existing cache rows: those may already back other,
 * successful games and must stay active.
 */
export async function deactivateQuestions(ids: string[]) {
  if (ids.length === 0) return;

  const { error } = await getSupabaseAdmin()
    .from("mcq_questions")
    .update({ is_active: false })
    .in("id", ids);

  if (error) {
    console.error("Supabase deactivate error:", error);
  }
}

// Cap on how many past question texts getSeenQuestionTexts returns -- keeps
// the excludeTexts set (and the cache read it widens, see sourceQuestions)
// bounded for a player who has replayed one topic dozens of times. Most
// recent first, so the cap drops the oldest, least-remembered questions.
const SEEN_QUESTIONS_LIMIT = 200;

/**
 * Question texts this user has already been served on this topic, across
 * every difficulty (a question seen in easy shouldn't come back in hard
 * either), most recent game first. Fed to sourceQuestions() as excludeTexts
 * so a replay ("Rejouer") of the same topic serves questions the player
 * hasn't seen yet -- the cache itself is shared by all players and has no
 * notion of who saw what, so without this a replay just re-shuffled the
 * same small pool. Filtered by language only because a text from another
 * locale can never match anyway.
 */
export async function getSeenQuestionTexts(params: {
  userId: string;
  topic: string;
  language: Locale;
}): Promise<string[]> {
  const { userId, topic, language } = params;

  const rows = await prisma.question.findMany({
    where: {
      game: {
        userId,
        language,
        topic: { equals: topic, mode: "insensitive" },
      },
    },
    select: { question: true },
    orderBy: { game: { timeStarted: "desc" } },
    take: SEEN_QUESTIONS_LIMIT,
  });

  return rows.map((row) => row.question);
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
  // Parent category context (display name, already localized), if the
  // player chose/inherited one in QuizCreation -- forwarded to AI generation
  // only, never used to key or filter the cache read below. See the pool
  // caching note further down for the consequence of that.
  categoryName?: string | null;
  // Category.countryScope (see categories.ts), forwarded the same way as
  // categoryName -- only /api/game passes this today, not next-batch (see
  // that route's own TODO on categoryName being entirely absent there).
  countryScope?: string | null;
  // Question texts to treat as already served -- the player's own history on
  // this topic (getSeenQuestionTexts, so a replay gets fresh questions), and
  // for next-batch also the first batch's own Question rows for this same
  // game, so the second batch
  // can't re-serve them even when the topic's cache pool is thin (see the
  // Photographie bug: pool near `amount` in size + independent shuffles per
  // batch meant batch 2 could re-draw batch 1's own questions). Filtered out
  // of the cache pool before the AI top-up decision AND the final slice, and
  // folded into the AI avoid-list -- excluding only from the prompt wouldn't
  // fix this, the bug was in the slice of old cache + new AI rows.
  excludeTexts?: string[];
}): Promise<{
  questions: SourcedQuestion[];
  cachedCount: number;
  poolTarget: number;
  // Ids of rows this call inserted into the cache (empty if the pool was
  // already big enough, or if generation ran but produced no new rows) --
  // see deactivateQuestions()'s doc comment for why callers must only ever
  // deactivate these, never a reused row's id.
  newlyCreatedIds: string[];
}> {
  const {
    topic,
    difficulty,
    language,
    amount,
    isGeography,
    categoryName = null,
    countryScope = null,
    excludeTexts = [],
  } = params;

  // A cache that only ever holds exactly `amount` rows for a given
  // topic/difficulty/language would serve the *identical* set on every
  // quiz forever -- nothing below would ever trigger new generation once
  // the cache already covered `amount`. Pull a pool a few times larger
  // than one quiz so there's always something to shuffle, and let it grow
  // by one more `amount`-sized AI batch per visit (same cost profile as a
  // cold cache) until it reaches that size.
  const poolTarget = amount * 3;
  const excludeKeys = new Set(excludeTexts.map((q) => q.trim().toLowerCase()));

  let cachedQuestions: SupabaseMCQQuestion[] = [];

  try {
    // Widened by the exclude list: rows the player already saw are dropped
    // right after this read, so they mustn't eat into the headroom that
    // unseen cached questions would otherwise fill.
    cachedQuestions = await fetchExistingMCQQuestions({
      topic,
      difficulty,
      language,
      amount: poolTarget + excludeKeys.size,
    });
  } catch (error) {
    console.error("Supabase cache read error:", error);
    cachedQuestions = [];
  }

  // Measure the pool in UNIQUE questions, not raw rows. Counting rows let
  // duplicate cache entries satisfy `poolTarget` and permanently shut off
  // new generation while the deduped serve-set stayed tiny -- the classic
  // "same questions every quiz" bug.
  let pool: SourcedQuestion[] = dedupeQuestions(cachedQuestions).filter(
    (q) => !excludeKeys.has(q.question.trim().toLowerCase())
  );
  let newlyCreatedIds: string[] = [];

  if (pool.length < poolTarget) {
    const aiQuestions = await generateQuestionsWithAI({
      topic,
      difficulty,
      language,
      amount,
      isGeography,
      categoryName,
      countryScope,
      existingQuestions: [...excludeTexts, ...pool.map((q) => q.question)],
    });

    // Drop AI questions that already exist in the cache BEFORE saving, so
    // duplicates never get persisted as new rows.
    const existingKeys = new Set([
      ...pool.map((q) => q.question.trim().toLowerCase()),
      ...excludeKeys,
    ]);
    const newAIQuestions = dedupeQuestions(aiQuestions)
      .filter((q) => !existingKeys.has(q.question.trim().toLowerCase()))
      .slice(0, amount);

    if (newAIQuestions.length > 0) {
      try {
        newlyCreatedIds = await saveGeneratedQuestionsToSupabase({
          topic,
          difficulty,
          language,
          questions: newAIQuestions,
        });
      } catch (error) {
        console.error("Supabase cache write error:", error);
      }

      pool = [...pool, ...newAIQuestions];
    }
  }

  // Randomize which `amount` questions are served this time instead of
  // always taking the same prefix of the pool.
  const questions = dedupeQuestions(shuffleArray(pool)).slice(0, amount);

  return { questions, cachedCount: cachedQuestions.length, poolTarget, newlyCreatedIds };
}
