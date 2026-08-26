import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/locales";

const POPULAR_TOPICS_LIMIT = 10;

type TopicUsageRow = { topic: string; usage_count: number | null };

/**
 * Most-requested quiz topics for `language`, sourced from the Supabase
 * question cache rather than Prisma's Game table -- this reflects what's
 * cheap to serve (already generated and cached), not just what's been
 * played. Topics are grouped case-insensitively (the cache accumulates
 * whatever casing each request happened to send) and summed by usage_count;
 * the display casing kept for each group is whichever individual row has
 * the highest usage_count, since that's the "canonical" spelling most
 * requests actually used.
 */
export async function getPopularTopics(language: Locale): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("mcq_questions")
    .select("topic, usage_count")
    .eq("is_active", true)
    .eq("language", language);

  if (error) {
    throw new Error(`Supabase fetch error: ${error.message}`);
  }

  const byKey = new Map<string, { topic: string; total: number; maxSingle: number }>();

  for (const row of (data ?? []) as TopicUsageRow[]) {
    const topic = row.topic?.trim();
    if (!topic) continue;

    const key = topic.toLowerCase();
    const usage = row.usage_count ?? 0;
    const existing = byKey.get(key);

    if (existing) {
      existing.total += usage;
      if (usage > existing.maxSingle) {
        existing.maxSingle = usage;
        existing.topic = topic;
      }
    } else {
      byKey.set(key, { topic, total: usage, maxSingle: usage });
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, POPULAR_TOPICS_LIMIT)
    .map((entry) => entry.topic);
}

const LATEST_TOPICS_LIMIT = 6;
// Rows fetched before dedup, not cards shown. Needs to be generous, not just
// a small multiple of LATEST_TOPICS_LIMIT: sourceQuestions() grows a topic's
// cache pool a batch at a time (poolTarget = amount * 3 in
// questionSourcing.ts), so dozens of consecutive rows can belong to the same
// one or two topics before a genuinely different topic shows up -- a small
// fetch limit can scan straight through a sparse language's whole recent
// history without ever finding LATEST_TOPICS_LIMIT distinct topics.
const LATEST_TOPICS_FETCH_LIMIT = 200;

/**
 * The most recently created quiz topics for `language`, newest first,
 * capped at LATEST_TOPICS_LIMIT. Grouped case-insensitively (the cache
 * accumulates whatever casing each request happened to send; a plain Set()
 * over raw strings would list "javascript" and "JavaScript" as two separate
 * cards), keeping whichever casing was seen first -- which, since rows
 * already arrive newest-first, is also the most recent casing. Swallows
 * Supabase errors into an empty list rather than throwing, since callers
 * use this for a homepage shelf that should just render nothing on failure
 * rather than take the page down with it.
 */
export async function getLatestTopics(language: Locale): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("mcq_questions")
    .select("topic, created_at, language")
    .eq("language", language)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(LATEST_TOPICS_FETCH_LIMIT);

  if (error) {
    console.error(`Supabase fetch error for language ${language}: ${error.message}`);
    return [];
  }

  const seen = new Set<string>();
  const topics: string[] = [];

  for (const row of (data ?? []) as { topic: string; language: string }[]) {
    const topic = row.topic?.trim();
    if (!topic) continue;

    // Extra safety check: ensure language matches
    if (row.language !== language) {
      console.warn(`Skipping topic "${topic}" with language ${row.language}, expected ${language}`);
      continue;
    }

    const key = topic.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    topics.push(topic);
    if (topics.length === LATEST_TOPICS_LIMIT) break;
  }

  return topics;
}

/**
 * Best-effort topic -> categorySlug lookup for TopicCarousel's card
 * background art (see getTopicAccent in topicImages.ts). `topics` are plain
 * strings from the mcq_questions cache -- it carries no categorySlug of its
 * own -- so this tries CategoryTopic.topicNormalized first (exact match,
 * same normalizeTopic() casing used everywhere else), then falls back to
 * the most recent Game.categorySlug for any topic that missed, since a
 * topic can be played under a category without ever getting a CategoryTopic
 * row. Topics with neither never make it into the returned map -- callers
 * fall back to their own generic image for those, same as before this
 * lookup existed.
 */
export async function getTopicCategorySlugs(
  topics: string[],
  language: Locale
): Promise<Map<string, string>> {
  if (topics.length === 0) return new Map();

  const result = new Map<string, string>();

  const categoryTopics = await prisma.categoryTopic.findMany({
    where: { topicNormalized: { in: topics }, language },
    select: { topicNormalized: true, categorySlug: true },
  });

  for (const row of categoryTopics) {
    if (!result.has(row.topicNormalized)) {
      result.set(row.topicNormalized, row.categorySlug);
    }
  }

  const stillMissing = topics.filter((topic) => !result.has(topic));

  if (stillMissing.length > 0) {
    const games = await prisma.game.findMany({
      where: { topic: { in: stillMissing }, language, categorySlug: { not: null } },
      orderBy: { timeStarted: "desc" },
      select: { topic: true, categorySlug: true },
    });

    for (const game of games) {
      if (!result.has(game.topic) && game.categorySlug) {
        result.set(game.topic, game.categorySlug);
      }
    }
  }

  return result;
}
