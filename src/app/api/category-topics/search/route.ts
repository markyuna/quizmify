import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isLocale, type Locale } from "@/i18n/locales";
import { getRequestLocale } from "@/i18n/get-locale";

export type CategoryTopicSearchResult = {
  id: string;
  topicDisplay: string;
  categorySlug: string;
};

export type CategoryTopicSearchResponse = {
  results: CategoryTopicSearchResult[];
};

const MAX_RESULTS = 8;

/**
 * Powers QuizSearchHero's live typeahead: partial, case-insensitive match
 * against the CategoryTopic catalog (see /api/category-topics/lookup for
 * the exact-match sibling this shares its response shape with). Plain
 * `contains` + `mode: "insensitive"` -- no trigram/full-text index. At
 * today's catalog size (a few hundred rows) an unindexed ILIKE is
 * submillisecond; revisit with a pg_trgm GIN index if the catalog grows
 * into the thousands -- that requires enabling `postgresqlExtensions` in
 * the Prisma generator (not on today) plus a manual `CREATE EXTENSION`,
 * since schema changes here go through `db push`, not a migrations folder.
 * Public/no-auth, same visibility as the catalog itself.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const requestedLanguage = url.searchParams.get("language");
  const language: Locale = isLocale(requestedLanguage) ? requestedLanguage : await getRequestLocale();

  if (!q) {
    return NextResponse.json<CategoryTopicSearchResponse>({ results: [] });
  }

  const results = await prisma.categoryTopic.findMany({
    where: {
      topicDisplay: { contains: q, mode: "insensitive" },
      language,
      hidden: false,
    },
    select: { id: true, topicDisplay: true, categorySlug: true },
    orderBy: { topicDisplay: "asc" },
    take: MAX_RESULTS,
  });

  return NextResponse.json<CategoryTopicSearchResponse>({ results });
}
