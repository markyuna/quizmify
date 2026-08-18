import { prisma } from "@/lib/db";
import { CATEGORY_SLUGS, type CategorySlug } from "./quelAnimalEsTu.config";

/**
 * Narrows a scored PersonalityTestAttempt.categoryScores down to the top 3
 * categories that are actually playable -- have at least one non-hidden
 * CategoryTopic row -- so a recommendation never points at an empty catalog
 * page. Reads the eligible set live from the DB rather than hardcoding it,
 * so a category that's empty today starts being recommended the moment it's
 * seeded, with no code change here.
 *
 * categoryScores is iterated in CATEGORY_SLUGS (catalog) order before
 * sorting by score, so Array.sort's stability keeps ties in that same
 * catalog order -- same tie-break idiom as computeResult().
 */
export async function getRecommendedCategorySlugs(
  categoryScores: Partial<Record<CategorySlug, number>>
): Promise<CategorySlug[]> {
  const rows = await prisma.categoryTopic.findMany({
    where: { hidden: false, categorySlug: { in: [...CATEGORY_SLUGS] } },
    select: { categorySlug: true },
    distinct: ["categorySlug"],
  });
  const withContent = new Set(rows.map((row) => row.categorySlug));

  return CATEGORY_SLUGS.filter((slug) => withContent.has(slug) && (categoryScores[slug] ?? 0) > 0)
    .sort((a, b) => (categoryScores[b] ?? 0) - (categoryScores[a] ?? 0))
    .slice(0, 3);
}
