import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/db";
import { getCategoryBySlug } from "@/lib/categories";
import { diceCoefficient } from "@/lib/textSimilarity";
import { isLocale, type Locale } from "@/i18n/locales";
import { getRequestLocale } from "@/i18n/get-locale";

export type CategoryTopicSuggestResponse = {
  categorySlug: string | null;
  categoryName: string | null;
  score: number | null;
};

// Empirically tuned against the real catalog (361 rows, 2026-08-26):
// unrelated topics topped out at 0.24 ("química orgánica" vs the whole es
// catalog), while genuinely related-but-not-identical topics landed at
// 0.35+ ("Animales" -> 0.40 "Animaux domestiques", "Capitales" -> 0.53
// "Capitales de Sudamérica"). Revisit if the catalog's topic phrasing style
// changes a lot.
const MIN_SUGGESTION_SCORE = 0.35;

/**
 * Similarity-based category suggestion for QuizCreation's selector, used as
 * a fallback once /api/category-topics/lookup's exact match misses. Kept as
 * a separate route (not folded into /lookup) so /lookup's "exists" meaning
 * stays a strict exact match -- QuizSearchHero also reads that field to
 * decide whether to auto-route straight into a category, and a fuzzy guess
 * there would silently change that flow's behavior too.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic")?.trim() ?? "";
  const requestedLocale = url.searchParams.get("locale");
  const locale: Locale = isLocale(requestedLocale) ? requestedLocale : await getRequestLocale();

  if (!topic) {
    return NextResponse.json<CategoryTopicSuggestResponse>({ categorySlug: null, categoryName: null, score: null });
  }

  const rows = await prisma.categoryTopic.findMany({
    where: { language: locale, hidden: false },
    select: { topicDisplay: true, categorySlug: true },
  });

  let best: { categorySlug: string; score: number } | null = null;
  for (const row of rows) {
    const score = diceCoefficient(topic, row.topicDisplay);
    if (score >= MIN_SUGGESTION_SCORE && (!best || score > best.score)) {
      best = { categorySlug: row.categorySlug, score };
    }
  }

  if (!best) {
    return NextResponse.json<CategoryTopicSuggestResponse>({ categorySlug: null, categoryName: null, score: null });
  }

  const category = getCategoryBySlug(best.categorySlug);
  const t = await getTranslations({ locale, namespace: "Categories" });

  return NextResponse.json<CategoryTopicSuggestResponse>({
    categorySlug: best.categorySlug,
    categoryName: category ? t(`${category.slug}.name`) : best.categorySlug,
    score: best.score,
  });
}
