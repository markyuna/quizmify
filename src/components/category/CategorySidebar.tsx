"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, ChevronDown, Brain } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCategoriesGroupedByGroup } from "@/lib/categories";

// Same 4 games as GameCarousel.tsx / games/page.tsx -- same routes (the
// `game` query param on /games) and same images/icon, not reinvented here.
const GAMES = [
  { gameParam: "word-of-day", titleKey: "games.wordOfDay.title", image: "/images/games/mot-du-jour-bg.webp" },
  { gameParam: "photo-of-day", titleKey: "games.photoOfDay.title", image: "/images/games/photo-du-jour-bg.webp" },
  { gameParam: "math-target", titleKey: "games.mathTarget.title", image: "/images/games/compte-est-bon-bg.webp" },
  { gameParam: "personality-test", titleKey: "games.personalityTest.title", icon: Brain },
] as const;

const GROUPED_CATEGORIES = getCategoriesGroupedByGroup();

function CategoryGroupDisclosure({ group, categories }: (typeof GROUPED_CATEGORIES)[number]) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="border-b border-slate-200/80 py-2 last:border-0 dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between py-1.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-100"
        aria-expanded={open}
      >
        {group}
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
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CategorySidebar() {
  const t = useTranslations("GuestGames");

  return (
    <aside className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un quiz..."
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Plus de catégories
        </h2>
        <div>
          {GROUPED_CATEGORIES.map((entry) => (
            <CategoryGroupDisclosure key={entry.group} group={entry.group} categories={entry.categories} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tous les Jeux
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {GAMES.map((game) => (
            <Link
              key={game.gameParam}
              href={`/games?game=${game.gameParam}`}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10"
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                {"image" in game ? (
                  <Image src={game.image} alt="" fill className="object-cover" sizes="32px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-violet-600 dark:text-violet-400">
                    <game.icon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{t(game.titleKey)}</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
