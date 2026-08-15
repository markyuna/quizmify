import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/db";
import { getCategoryBySlug } from "@/lib/categories";
import { normalizeTopic } from "@/lib/questionGeneration";
import { isLocale, type Locale } from "@/i18n/locales";
import { getRequestLocale } from "@/i18n/get-locale";

export type CategoryTopicLookupResponse = {
  exists: boolean;
  categorySlug: string | null;
  categoryName: string | null;
};

/**
 * Powers QuizCreation's category selector: as the user types a topic, this
 * tells the client whether that topic is already published in the catalog
 * (see CategoryTopic in prisma/schema.prisma) and under which category, so
 * the selector can hide itself or show "already in {category}" instead of
 * asking the user to pick again. Public/no-auth -- same visibility as the
 * catalog pages themselves, nothing sensitive here.
 *
 * `locale` narrows to an exact-language match first (so "already exists"
 * reflects what this visitor would actually see natively); if there's no
 * row in their language, it falls back to a match in any language purely
 * for the informational hint -- this never blocks creating a new, native
 * row of their own.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic")?.trim() ?? "";
  const requestedLocale = url.searchParams.get("locale");
  const locale: Locale = isLocale(requestedLocale) ? requestedLocale : await getRequestLocale();

  if (!topic) {
    return NextResponse.json<CategoryTopicLookupResponse>({
      exists: false,
      categorySlug: null,
      categoryName: null,
    });
  }

  const topicNormalized = normalizeTopic(topic);

  const existing =
    (await prisma.categoryTopic.findFirst({
      where: { topicNormalized, language: locale },
      select: { categorySlug: true },
    })) ??
    (await prisma.categoryTopic.findFirst({
      where: { topicNormalized },
      select: { categorySlug: true },
    }));

  if (!existing) {
    return NextResponse.json<CategoryTopicLookupResponse>({
      exists: false,
      categorySlug: null,
      categoryName: null,
    });
  }

  const category = getCategoryBySlug(existing.categorySlug);
  const t = await getTranslations({ locale, namespace: "Categories" });

  return NextResponse.json<CategoryTopicLookupResponse>({
    exists: true,
    categorySlug: existing.categorySlug,
    categoryName: category ? t(`${category.slug}.name`) : existing.categorySlug,
  });
}
