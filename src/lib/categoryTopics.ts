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

/**
 * How many topic cards getCategoryTopics() actually returns for a category,
 * given how many rows exist in the visitor's own locale (`nativeCount`) and
 * across every language combined (`totalCount`) -- both counted with
 * hidden = false, and nativeCount is always <= totalCount. This is the single
 * source of truth for the native-first / pad-with-translations rule:
 * getCategoryTopics() sizes its supplemental fetch from it, and
 * getCategoryTopicCountsByLocale() reuses it so the /categories card badge can
 * never disagree with the list on the category page.
 */
export function computeVisibleTopicCount(nativeCount: number, totalCount: number): number {
  const smallCatalog = totalCount <= SMALL_CATALOG_THRESHOLD;

  // Small (effectively single-language) catalog missing any row for this
  // locale: show the whole cross-language catalog, translated on demand.
  if (smallCatalog && nativeCount < totalCount) return totalCount;

  // Larger catalog with a thin native set: pad toward MIN_NATIVE_RESULTS, but
  // never past the number of non-native rows that actually exist.
  if (!smallCatalog && nativeCount < MIN_NATIVE_RESULTS) {
    return nativeCount + Math.min(MIN_NATIVE_RESULTS - nativeCount, totalCount - nativeCount);
  }

  // Enough native rows, or already showing everything: native only.
  return nativeCount;
}

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
  const totalCount = await prisma.categoryTopic.count({ where: { categorySlug, hidden: false } });

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

  // Single source of truth for the native-first / pad-with-translations rule.
  // getCategoryTopicCountsByLocale() calls the same helper, so the /categories
  // card badge can't disagree with the list rendered here. supplementalNeeded
  // is how many non-native rows to append; for a small (single-language)
  // catalog it works out to the entire non-native set, so `take` returns
  // exactly the same full list the previous uncapped query did.
  const visibleCount = computeVisibleTopicCount(nativeTopics.length, totalCount);
  const supplementalNeeded = visibleCount - nativeTopics.length;

  let supplementalTopics: CategoryTopic[] = [];
  if (supplementalNeeded > 0) {
    supplementalTopics = await prisma.categoryTopic.findMany({
      where: { categorySlug, hidden: false, language: { not: locale } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: supplementalNeeded,
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

/**
 * Visible topic count per category for `locale`, for the /categories overview
 * grid -- i.e. the number getCategoryTopics() would actually render for each
 * category (native rows plus the translated padding it adds), via the shared
 * computeVisibleTopicCount helper. Previously returned the raw native-row
 * count, which disagreed with the category page whenever padding kicked in
 * (a fr-only catalog showed "1 topic" / "Coming soon" on the card but 13
 * topics inside). Two groupBy aggregates -- native rows for this locale, and
 * total visible rows across every language -- rather than one query per
 * category. A category with zero visible rows in every language is absent
 * from the result; callers treat a missing key as 0 (the "Coming soon"
 * plural branch).
 */
export async function getCategoryTopicCountsByLocale(locale: Locale): Promise<Record<string, number>> {
  const [nativeRows, totalRows] = await Promise.all([
    prisma.categoryTopic.groupBy({
      by: ["categorySlug"],
      where: { hidden: false, language: locale },
      _count: { _all: true },
    }),
    prisma.categoryTopic.groupBy({
      by: ["categorySlug"],
      where: { hidden: false },
      _count: { _all: true },
    }),
  ]);

  const nativeCountBySlug = new Map(
    nativeRows.map((row) => [row.categorySlug, row._count._all])
  );

  return Object.fromEntries(
    totalRows.map((row) => [
      row.categorySlug,
      computeVisibleTopicCount(nativeCountBySlug.get(row.categorySlug) ?? 0, row._count._all),
    ])
  );
}
