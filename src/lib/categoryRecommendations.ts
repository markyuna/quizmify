import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";
import { CATEGORY_SLUGS, isCategorySlug, type CategorySlug } from "@/lib/personalityTests/quelAnimalEsTu.config";

export type CategoryPerformance = {
  categorySlug: CategorySlug;
  attempts: number;
  // 0..1, derived from SUM(correctAnswers)/SUM(totalQuestions) -- Attempt
  // has no separate accuracy column.
  accuracy: number;
};

/**
 * Per-category performance for one user, categorized attempts only (Game
 * with a non-null categorySlug) -- same JOIN shape as
 * getTopicLeaderboardPage in leaderboard.ts, just grouped by categorySlug
 * and filtered to a single userId instead of grouping by userId globally.
 * Keyed by CategorySlug for O(1) lookup during ranking; any row whose
 * categorySlug isn't in the current CATEGORY_SLUGS catalog (a retired or
 * renamed category) is silently dropped rather than surfaced as a
 * recommendation candidate.
 */
export async function getCategoryPerformanceForUser(userId: string): Promise<Map<CategorySlug, CategoryPerformance>> {
  const rows = await prisma.$queryRaw<
    Array<{
      categorySlug: string;
      attempts: bigint | number;
      totalCorrect: bigint | number;
      totalQuestions: bigint | number;
    }>
  >`
    SELECT g."categorySlug" AS "categorySlug",
           COUNT(*)::int AS attempts,
           SUM(a."correctAnswers")::int AS "totalCorrect",
           SUM(a."totalQuestions")::int AS "totalQuestions"
    FROM "Attempt" a
    JOIN "Game" g ON g.id = a."gameId"
    WHERE a."userId" = ${userId} AND g."categorySlug" IS NOT NULL
    GROUP BY g."categorySlug"
  `;

  const performanceBySlug = new Map<CategorySlug, CategoryPerformance>();
  for (const row of rows) {
    if (!isCategorySlug(row.categorySlug)) continue;

    const totalQuestions = Number(row.totalQuestions);
    if (totalQuestions === 0) continue;

    performanceBySlug.set(row.categorySlug, {
      categorySlug: row.categorySlug,
      attempts: Number(row.attempts),
      accuracy: Number(row.totalCorrect) / totalQuestions,
    });
  }

  return performanceBySlug;
}

/**
 * Overall accuracy across ALL of a user's Attempts, categorized or not --
 * the baseline that getCategoryPerformanceForUser's per-category numbers
 * get compared against to decide weak/dominated. Null when the user has no
 * Attempts at all (nothing to divide), which also means
 * getCategoryPerformanceForUser necessarily returns an empty map for them.
 */
export async function getOverallAccuracyForUser(userId: string): Promise<number | null> {
  const aggregate = await prisma.attempt.aggregate({
    where: { userId },
    _sum: { correctAnswers: true, totalQuestions: true },
  });

  const totalQuestions = aggregate._sum.totalQuestions ?? 0;
  if (totalQuestions === 0) return null;

  return (aggregate._sum.correctAnswers ?? 0) / totalQuestions;
}

/**
 * The recommendation universe: CATEGORY_SLUGS filtered down to categories
 * that actually have playable CategoryTopic content, in catalog order.
 * Deliberately not shared with getRecommendedCategorySlugs() in
 * personalityTests/recommendations.ts (Fase 2's guest cold-start) even
 * though the query is nearly identical -- the two features can evolve
 * their candidate universe independently.
 */
export async function getCandidateCategorySlugsWithContent(): Promise<CategorySlug[]> {
  const rows = await prisma.categoryTopic.findMany({
    where: { hidden: false, categorySlug: { in: [...CATEGORY_SLUGS] } },
    select: { categorySlug: true },
    distinct: ["categorySlug"],
  });
  const withContent = new Set(rows.map((row) => row.categorySlug));

  return CATEGORY_SLUGS.filter((slug) => withContent.has(slug));
}

/**
 * Pure ranking function -- no DB access, so it's directly unit-testable.
 * Priority 1: categories the user has played (categorySlug set) where
 * accuracy is strictly below their overall accuracy ("weak"), weakest
 * first. Priority 2: candidate categories with zero attempts
 * ("unexplored"), in catalog order, filling whatever's left of the top 3.
 * A category whose accuracy is >= overall accuracy is "dominated" --
 * excluded entirely, neither recommended as weak nor counted as
 * unexplored. When overallAccuracy is null (no Attempts at all -- so
 * performanceBySlug is necessarily empty too), every candidate falls
 * through to "unexplored" by construction, which naturally produces "first
 * 3 candidates by catalog order" for a day-1 user with no special-casing.
 */
export function rankCategoriesForUser(
  candidateSlugs: CategorySlug[],
  performanceBySlug: Map<CategorySlug, CategoryPerformance>,
  overallAccuracy: number | null
): CategorySlug[] {
  const weak: CategorySlug[] = [];
  const unexplored: CategorySlug[] = [];

  for (const slug of candidateSlugs) {
    const performance = performanceBySlug.get(slug);

    if (!performance || overallAccuracy === null) {
      unexplored.push(slug);
      continue;
    }

    if (performance.accuracy < overallAccuracy) {
      weak.push(slug);
    }
    // else: performance.accuracy >= overallAccuracy -- "dominated", excluded entirely.
  }

  // weak/unexplored were both built by iterating candidateSlugs in order,
  // so they're already catalog-ordered; sorting weak by accuracy is stable
  // (ES2019+), which keeps accuracy ties in that same catalog order --
  // same tie-break idiom as computeResult()/getRecommendedCategorySlugs().
  weak.sort((a, b) => performanceBySlug.get(a)!.accuracy - performanceBySlug.get(b)!.accuracy);

  return [...weak, ...unexplored].slice(0, 3);
}

export type CategoryRecommendationResult = {
  recommendedSlugs: CategorySlug[];
  generatedAt: Date;
};

/**
 * Returns a cached category recommendation, regenerating it only when the
 * user has completed at least one more categorized Attempt since it was
 * last generated -- same pull/cache-then-compare shape as
 * getOrGenerateTopicRecommendation in recommendations.ts, but with no
 * activity threshold: any delta (>=1) is stale, since categorySlug
 * coverage is thin enough today (see Fase 3 audit) that every new
 * categorized attempt is worth reflecting immediately. Returns null for a
 * guest (no userId) -- Fase 4 decides what a guest sees instead.
 */
export async function getOrGenerateCategoryRecommendation(
  userId: string | null | undefined
): Promise<CategoryRecommendationResult | null> {
  if (!userId) return null;

  const [cached, liveAttemptCount] = await Promise.all([
    prisma.categoryRecommendationMascota.findUnique({ where: { userId } }),
    prisma.attempt.count({ where: { userId, game: { categorySlug: { not: null } } } }),
  ]);

  if (cached && cached.attemptCountAtGeneration === liveAttemptCount) {
    return {
      recommendedSlugs: cached.recommendedSlugs as CategorySlug[],
      generatedAt: cached.generatedAt,
    };
  }

  const [candidateSlugs, performanceBySlug, overallAccuracy] = await Promise.all([
    getCandidateCategorySlugsWithContent(),
    getCategoryPerformanceForUser(userId),
    getOverallAccuracyForUser(userId),
  ]);

  const recommendedSlugs = rankCategoriesForUser(candidateSlugs, performanceBySlug, overallAccuracy);
  const now = new Date();

  await prisma.categoryRecommendationMascota.upsert({
    where: { userId },
    create: {
      userId,
      recommendedSlugs: recommendedSlugs as unknown as Prisma.InputJsonValue,
      attemptCountAtGeneration: liveAttemptCount,
      generatedAt: now,
    },
    update: {
      recommendedSlugs: recommendedSlugs as unknown as Prisma.InputJsonValue,
      attemptCountAtGeneration: liveAttemptCount,
      generatedAt: now,
    },
  });

  return { recommendedSlugs, generatedAt: now };
}
