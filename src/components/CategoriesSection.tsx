import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LayoutGrid, ArrowRight } from "lucide-react";

import { getCategoryBySlug } from "@/lib/categories";
import CategoryCard from "@/components/category/CategoryCard";

// Editorial pick spanning all 7 CATEGORY_GROUPS -- 16 of the 17 categories,
// excluding "tests-de-personnalite" (has its own entry point via /games).
// Full list is /categories.
const FEATURED_CATEGORY_SLUGS = [
  "culture-generale",
  "histoire",
  "geographie",
  "sciences",
  "arts",
  "france",
  "cinema",
  "disney",
  "harry-potter",
  "sports",
  "animaux",
  "nature",
  "langue-francaise",
  "alimentation",
  "code-de-la-route",
  "drapeaux",
] as const;

const FEATURED_CATEGORIES = FEATURED_CATEGORY_SLUGS.map((slug) => getCategoryBySlug(slug)).filter(
  (category) => category !== undefined
);

/**
 * A plain Server Component, same shape as TopicCarousel.tsx: mobile
 * horizontal snap-scroll, desktop fixed grid. Sits between HeroSection and
 * TopicCarousel on the homepage.
 */
export default async function CategoriesSection() {
  const t = await getTranslations("CategoriesSection");
  const tCategories = await getTranslations("Categories");

  return (
    <section className="px-4 pt-10 md:px-8 md:pt-14" aria-labelledby="categories-section-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h2 id="categories-section-heading" className="text-lg font-bold text-slate-900 dark:text-white md:text-xl">
            {t("title")}
          </h2>
        </div>
        <p className="mb-5 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{t("subtitle")}</p>

        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-8 md:gap-3 md:overflow-visible md:px-0">
          {FEATURED_CATEGORIES.map((category) => (
            <CategoryCard
              key={category.slug}
              icon={category.icon}
              name={tCategories(`${category.slug}.name`)}
              href={`/quiz/categoria/${category.slug}`}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-900 backdrop-blur-xl transition hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10"
          >
            {t("viewAllCta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
