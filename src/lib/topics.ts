import { getSupabaseAdmin } from "@/lib/supabase-admin";
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

/**
 * Every distinct quiz topic cached for `language`, alphabetized, with no
 * cap -- unlike getPopularTopics this isn't "top N by usage," it's the full
 * catalog. Grouped case-insensitively for the same reason as above (the
 * cache accumulates whatever casing each request happened to send; a plain
 * Set() over raw strings would list "javascript" and "JavaScript" as two
 * separate entries), keeping whichever casing was seen first per group.
 * Swallows Supabase errors into an empty list rather than throwing, since
 * callers use this for a homepage shelf that should just render nothing on
 * failure rather than take the page down with it.
 */
export async function getAllTopics(language: Locale): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("mcq_questions")
    .select("topic")
    .eq("language", language)
    .eq("is_active", true);

  if (error) {
    console.error(`Supabase fetch error: ${error.message}`);
    return [];
  }

  const byKey = new Map<string, string>();

  for (const row of (data ?? []) as { topic: string }[]) {
    const topic = row.topic?.trim();
    if (!topic) continue;

    const key = topic.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, topic);
  }

  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
}
