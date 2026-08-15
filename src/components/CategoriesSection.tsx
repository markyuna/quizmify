import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LayoutGrid, ArrowRight } from "lucide-react";

import { getCategoryBySlug } from "@/lib/categories";

// Editorial pick spanning all 7 CATEGORY_GROUPS -- 16 of the 18 categories,
// excluding "tests-de-personnalite" (has its own entry point via /games) and
// "football" (redundant with "sports" at this size). Full list is /categories.
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
            <Link
              key={category.slug}
              href={`/quiz/categoria/${category.slug}`}
              className="group relative min-w-[150px] shrink-0 snap-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl transition hover:scale-[1.02] hover:shadow-lg dark:border-white/10 dark:bg-white/5 md:min-w-0"
            >
              <div className="flex h-16 w-full items-center justify-center bg-slate-100 text-3xl transition-all duration-300 group-hover:scale-105 group-hover:bg-gradient-to-br group-hover:from-violet-600 group-hover:to-cyan-500 group-hover:shadow-inner dark:bg-white/10">
                <span aria-hidden="true" className="transition-transform duration-300 group-hover:scale-110">
                  {category.icon}
                </span>
              </div>

              <div className="p-2.5">
                <h3 className="line-clamp-2 text-xs font-semibold text-slate-900 dark:text-white">
                  {tCategories(`${category.slug}.name`)}
                </h3>
              </div>
            </Link>
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
