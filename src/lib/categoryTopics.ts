import { z } from "zod";

import { prisma } from "@/lib/db";
import { openai } from "@/lib/openai";
import { LANGUAGE_NAMES } from "@/lib/questionGeneration";
import type { CategoryTopic } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/locales";

// Placeholder until there's real usage data to calibrate against -- see the
// design note on CategoryTopic in prisma/schema.prisma for why trending is
// computed at read time instead of a stored counter.
const TRENDING_WINDOW_DAYS = 7;
const TRENDING_THRESHOLD = 3;
// Below this many native-language rows, pad the list out with rows from
// other languages (translated on demand) rather than showing a near-empty
// category page just because this locale hasn't been played much yet.
const MIN_NATIVE_RESULTS = 6;
// A category with this many rows or fewer (any language combined) shows its
// full catalog in every locale instead of being capped at MIN_NATIVE_RESULTS
// -- a hand-seeded batch (e.g. animaux, cinema: 12-13 rows, all fr) would
// otherwise have an arbitrary 6-of-N subset padded in for a visitor with no
// native rows, and that subset isn't guaranteed to match between locales
// (see the id tiebreaker above/below). Above this size, the original
// anti-spam cap still applies -- this only bypasses it for catalogs small
// enough that showing everything is never actually a flood. Every category
// today (seeded or organic) tops out at 13; 20 leaves headroom for a future
// seed batch without needing to keep raising this number.
const SMALL_CATALOG_THRESHOLD = 20;

export type CategoryTopicWithTrending = CategoryTopic & {
  trending: boolean;
  // What the card should actually show/link with -- topicDisplay verbatim
  // for a native-language row, or a translated (cached or freshly
  // generated) label for a row borrowed from another language. Never the
  // quiz questions themselves, just this short catalog label.
  displayLabel: string;
};

export type CategoryTopicSort = "recent" | "trending";

const translationResponseSchema = z.object({ translated: z.string().min(1).max(200) });

/**
 * One cheap OpenAI call to translate a short topic label -- never the quiz
 * content itself. Best-effort: any failure (network, malformed JSON, empty
 * response) returns null and the caller falls back to the native label
 * rather than breaking the catalog page render.
 */
async function translateLabel(topicDisplay: string, locale: Locale): Promise<string | null> {
  try {
    const languageName = LANGUAGE_NAMES[locale];
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            `Translate a short quiz topic term into ${languageName}. Reply with only the translated ` +
            `term, no quotes, no explanation. Return valid JSON: {"translated": "string"}.`,
        },
        { role: "user", content: topicDisplay },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = translationResponseSchema.parse(JSON.parse(content));
    return parsed.translated.trim();
  } catch (error) {
    console.error("CategoryTopic label translation failed (non-fatal):", error);
    return null;
  }
}

/**
 * Native-language rows need no translation. Non-native rows check
 * translatedLabels (a { [language]: string } cache on the row) first, and
 * only call OpenAI -- then persist the result -- on a genuine cache miss,
 * so a given row/locale pair is translated at most once.
 */
async function resolveDisplayLabel(topic: CategoryTopic, locale: Locale): Promise<string> {
  if (topic.language === locale) return topic.topicDisplay;

  const cached = topic.translatedLabels as Record<string, string> | null;
  if (cached?.[locale]) return cached[locale];

  const translated = await translateLabel(topic.topicDisplay, locale);
  if (!translated) return topic.topicDisplay;

  try {
    await prisma.categoryTopic.update({
      where: { id: topic.id },
      data: { translatedLabels: { ...(cached ?? {}), [locale]: translated } },
    });
  } catch (error) {
    console.error("CategoryTopic translation cache write failed (non-fatal):", error);
  }

  return translated;
}

/**
 * Catalog entries for one category, in `locale`. Native-language rows come
 * first; pads out with rows from other languages for the same category
 * (translated label, see resolveDisplayLabel) -- with no cap at all for a
 * small (<=SMALL_CATALOG_THRESHOLD-row) category, so every locale sees the
 * identical full set, or capped at MIN_NATIVE_RESULTS total for a larger
 * one, so a heavily-played category doesn't flood a thin-native-content
 * locale with translated cards. Each row is flagged `trending` based on how
 * many Game rows finished playing that exact topic, in that row's OWN
 * language, in the last 7 days -- trending is per-language, not merged
 * across translations of the same underlying topic.
 */
export async function getCategoryTopics(
  categorySlug: string,
  locale: Locale,
  sort: CategoryTopicSort = "recent"
): Promise<CategoryTopicWithTrending[]> {
  // Below SMALL_CATALOG_THRESHOLD total rows, every locale gets the full
  // catalog (see the constant's comment) -- above it, the original
  // MIN_NATIVE_RESULTS cap applies.
  const totalCount = await prisma.categoryTopic.count({ where: { categorySlug, hidden: false } });
  const smallCatalog = totalCount <= SMALL_CATALOG_THRESHOLD;

  // `id` as a secondary sort key: rows seeded in the same createMany() batch
  // (see e.g. the animaux/cinema/sports catalog seeds) share the exact same
  // createdAt, so createdAt alone leaves ties with no defined order --
  // Postgres doesn't guarantee a stable row order for a tied ORDER BY, so a
  // `take` slice on top of it (the supplemental query below) could return a
  // different subset per request/locale. id is unique and immutable, so it
  // makes the ordering (and therefore which rows a `take` cuts) fully
  // deterministic without changing the intended recency-first ordering for
  // rows that don't tie.
  const nativeTopics = await prisma.categoryTopic.findMany({
    where: { categorySlug, hidden: false, language: locale },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  let supplementalTopics: CategoryTopic[] = [];
  if (smallCatalog ? nativeTopics.length < totalCount : nativeTopics.length < MIN_NATIVE_RESULTS) {
    supplementalTopics = await prisma.categoryTopic.findMany({
      where: { categorySlug, hidden: false, language: { not: locale } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      // No cap for a small catalog -- every non-native row comes along, so
      // the visitor sees the exact same full set as a native speaker would,
      // just translated. Large catalogs keep the original pad-to-6 cap.
      ...(smallCatalog ? {} : { take: MIN_NATIVE_RESULTS - nativeTopics.length }),
    });
  }

  const allTopics = [...nativeTopics, ...supplementalTopics];
  if (allTopics.length === 0) return [];

  const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Grouped by [topic, language] -- a row's trending flag only counts plays
  // in that row's own language, never plays of a translated copy elsewhere.
  const recentCounts = await prisma.game.groupBy({
    by: ["topic", "language"],
    where: {
      topic: { in: allTopics.map((topic) => topic.topicNormalized) },
      timeEnded: { gte: since },
    },
    _count: { _all: true },
  });

  const countByTopicLanguage = new Map(
    recentCounts.map((row) => [`${row.topic}::${row.language}`, row._count._all])
  );

  const withTrendingAndLabel: CategoryTopicWithTrending[] = await Promise.all(
    allTopics.map(async (topic) => ({
      ...topic,
      trending:
        (countByTopicLanguage.get(`${topic.topicNormalized}::${topic.language}`) ?? 0) >= TRENDING_THRESHOLD,
      displayLabel: await resolveDisplayLabel(topic, locale),
    }))
  );

  if (sort !== "trending") return withTrendingAndLabel;

  return [...withTrendingAndLabel].sort((a, b) => {
    if (a.trending !== b.trending) return a.trending ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
