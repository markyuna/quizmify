import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

import { getCategoriesGroupedByGroup } from "@/lib/categories";
import { getCategoryTopicCountsByLocale } from "@/lib/categoryTopics";
import { getRequestLocale } from "@/i18n/get-locale";
import { GAMES_CATALOG } from "@/lib/games/catalog";
import CategoryGroupSection from "@/components/category/CategoryGroupSection";
import QuizSearchHero from "@/components/QuizSearchHero";

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
  const [t, tBreadcrumb, tGames, countsBySlug] = await Promise.all([
    getTranslations("CategoriesPage"),
    getTranslations("CategoryBreadcrumb"),
    getTranslations("GuestGames"),
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

      <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
        {t("heading")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">{t("subtitle")}</p>

      <div className="mt-6">
        <QuizSearchHero />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {groupedCategories.map((entry) => (
            <CategoryGroupSection key={entry.group} entry={entry} countsBySlug={countsBySlug} />
          ))}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("gamesHeading")}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {GAMES_CATALOG.map((game) => (
                <Link
                  key={game.key}
                  href={`/games?game=${game.key}`}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10"
                >
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                    {game.image ? (
                      <Image src={game.image} alt="" fill className="object-cover" sizes="32px" />
                    ) : game.icon ? (
                      <div className="flex h-full w-full items-center justify-center text-violet-600 dark:text-violet-400">
                        <game.icon className="h-5 w-5" />
                      </div>
                    ) : null}
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {tGames(game.titleKey)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
