import { prisma } from "@/lib/db";
import type { CategoryTopic } from "@/generated/prisma/client";

// Placeholder until there's real usage data to calibrate against -- see the
// design note on CategoryTopic in prisma/schema.prisma for why this is
// computed at read time instead of a stored counter.
const TRENDING_WINDOW_DAYS = 7;
const TRENDING_THRESHOLD = 3;

export type CategoryTopicWithTrending = CategoryTopic & { trending: boolean };

export type CategoryTopicSort = "recent" | "trending";

/**
 * Catalog entries for one category, each flagged `trending` based on how
 * many Game rows finished playing that exact topic in the last 7 days.
 * Game.topic is already run through normalizeTopic() before it's saved (see
 * POST /api/game), same as CategoryTopic.topicNormalized -- so this is a
 * direct equality match, no re-normalizing needed here.
 */
export async function getCategoryTopics(
  categorySlug: string,
  sort: CategoryTopicSort = "recent"
): Promise<CategoryTopicWithTrending[]> {
  const topics = await prisma.categoryTopic.findMany({
    where: { categorySlug, hidden: false },
    orderBy: { createdAt: "desc" },
  });

  if (topics.length === 0) return [];

  const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const recentCounts = await prisma.game.groupBy({
    by: ["topic"],
    where: {
      topic: { in: topics.map((topic) => topic.topicNormalized) },
      timeEnded: { gte: since },
    },
    _count: { _all: true },
  });

  const countByTopic = new Map(recentCounts.map((row) => [row.topic, row._count._all]));

  const withTrending: CategoryTopicWithTrending[] = topics.map((topic) => ({
    ...topic,
    trending: (countByTopic.get(topic.topicNormalized) ?? 0) >= TRENDING_THRESHOLD,
  }));

  if (sort !== "trending") return withTrending;

  return [...withTrending].sort((a, b) => {
    if (a.trending !== b.trending) return a.trending ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
