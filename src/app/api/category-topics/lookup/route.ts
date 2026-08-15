import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCategoryBySlug } from "@/lib/categories";
import { normalizeTopic } from "@/lib/questionGeneration";

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
 */
export async function GET(req: Request) {
  const topic = new URL(req.url).searchParams.get("topic")?.trim() ?? "";

  if (!topic) {
    return NextResponse.json<CategoryTopicLookupResponse>({
      exists: false,
      categorySlug: null,
      categoryName: null,
    });
  }

  const topicNormalized = normalizeTopic(topic);

  const existing = await prisma.categoryTopic.findFirst({
    where: { topicNormalized },
    select: { categorySlug: true },
  });

  if (!existing) {
    return NextResponse.json<CategoryTopicLookupResponse>({
      exists: false,
      categorySlug: null,
      categoryName: null,
    });
  }

  const category = getCategoryBySlug(existing.categorySlug);

  return NextResponse.json<CategoryTopicLookupResponse>({
    exists: true,
    categorySlug: existing.categorySlug,
    categoryName: category?.name ?? existing.categorySlug,
  });
}
