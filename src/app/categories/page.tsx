import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getCategoriesGroupedByGroup } from "@/lib/categories";
import { getCategoryTopicCountsByLocale } from "@/lib/categoryTopics";
import { getRequestLocale } from "@/i18n/get-locale";
import CategoryGroupSection from "@/components/category/CategoryGroupSection";
import CompactCategorySearch from "@/components/category/CompactCategorySearch";
import GamesSidebarSection from "@/components/category/GamesSidebarSection";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CategoriesPage");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/categories" },
  };
}

export default async function CategoriesPage() {
  const locale = await getRequestLocale();
  const [t, tBreadcrumb, countsBySlug] = await Promise.all([
    getTranslations("CategoriesPage"),
    getTranslations("CategoryBreadcrumb"),
    getCategoryTopicCountsByLocale(locale),
  ]);

  const groupedCategories = getCategoriesGroupedByGroup();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8 md:px-8">
      <nav
        aria-label={tBreadcrumb("ariaLabel")}
        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400"
      >
        <Link href="/" className="font-medium hover:text-violet-600 dark:hover:text-violet-400">
          {t("breadcrumbHome")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold text-slate-900 dark:text-white">{t("breadcrumbCurrent")}</span>
      </nav>

      <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-[url('/images/dashboard_background.webp')] bg-cover bg-center px-6 py-12 shadow-2xl shadow-black/10 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950/80 via-slate-950/70 to-cyan-950/70" />
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <span aria-hidden="true" className="text-4xl">🗂️</span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{t("heading")}</h1>
          <p className="mt-2 text-sm text-slate-200 sm:text-base">{t("subtitle")}</p>
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {groupedCategories.map((entry) => (
            <CategoryGroupSection key={entry.group} entry={entry} countsBySlug={countsBySlug} />
          ))}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <CompactCategorySearch />

          <GamesSidebarSection />
        </aside>
      </div>
    </main>
  );
}
