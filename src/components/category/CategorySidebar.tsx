"use client";

import * as React from "react";
import axios from "axios";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCategoriesGroupedByGroup } from "@/lib/categories";
import { ALL_GAMES } from "@/lib/games/allGames";
import GameCard from "@/components/games/GameCard";

const GROUPED_CATEGORIES = getCategoriesGroupedByGroup();

function CategoryGroupDisclosure({ group, categories }: (typeof GROUPED_CATEGORIES)[number]) {
  const [open, setOpen] = React.useState(false);
  const tGroups = useTranslations("CategoryGroups");
  const tCategories = useTranslations("Categories");

  return (
    <div className="border-b border-slate-200/80 py-2 last:border-0 dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between py-1.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-100"
        aria-expanded={open}
      >
        {tGroups(group)}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul className="mt-1 space-y-1 pb-1 pl-1">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/quiz/categoria/${category.slug}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-violet-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-violet-300"
              >
                <span aria-hidden="true">{category.icon}</span>
                {tCategories(`${category.slug}.name`)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CategorySidebar() {
  const tSidebar = useTranslations("CategorySidebar");

  // Client-side only (this is a "use client" component) so the category
  // pages stay statically rendered. Puzzle du Jour's own eligibility
  // endpoint carries the `isPro` flag the game cards need for their badges;
  // 401s for guests are swallowed (everything stays non-Pro, the correct
  // "show the locked state" outcome for them anyway).
  const [isPro, setIsPro] = React.useState(false);

  React.useEffect(() => {
    axios
      .get<{ isPro: boolean }>("/api/puzzle-du-jour/eligibility")
      .then((res) => setIsPro(res.data.isPro))
      .catch(() => {});
  }, []);

  return (
    <aside className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={tSidebar("searchPlaceholder")}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {tSidebar("moreCategories")}
        </h2>
        <div>
          {GROUPED_CATEGORIES.map((entry) => (
            <CategoryGroupDisclosure key={entry.group} group={entry.group} categories={entry.categories} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {tSidebar("allGames")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {ALL_GAMES.map((game) => (
            <GameCard key={game.key} game={game} isPro={isPro} variant="grid" />
          ))}
        </div>
      </div>
    </aside>
  );
}
