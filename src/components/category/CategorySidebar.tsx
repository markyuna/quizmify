"use client";

import * as React from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, ChevronDown, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCategoriesGroupedByGroup } from "@/lib/categories";
import { GAMES_CATALOG } from "@/lib/games/catalog";

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
  const t = useTranslations("GuestGames");
  const tSidebar = useTranslations("CategorySidebar");
  const tPuzzleDuJour = useTranslations("PuzzleDuJour");

  // Client-side only (this is a "use client" component) -- same isPro
  // fetch QuizCreation.tsx already does for its own Pro badge, reused here
  // rather than adding a second endpoint. 401s for guests/logged-out
  // visitors are swallowed: isPro just stays false, which is the correct
  // "show the badge" state for them anyway.
  const [isPro, setIsPro] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    axios
      .get<{ isPro: boolean }>("/api/game/eligibility")
      .then((res) => {
        if (!cancelled) setIsPro(res.data.isPro);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{t(game.titleKey)}</span>
            </Link>
          ))}

          {/* Not a GAMES_CATALOG entry on purpose -- that type/registry is
              specifically for guest games (no login, played via
              /games?game=X). Puzzle du Jour requires auth + Pro and lives
              at its own route, so it's a one-off card here and in
              GameCarousel.tsx rather than forcing it into that shape. */}
          <Link
            href="/puzzle-du-jour"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10"
          >
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
              <Image src="/images/games/puzzle-du-jour-icon.png" alt="" fill className="object-cover" sizes="32px" />
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {tPuzzleDuJour("title")}
            </span>
            {!isPro && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                <Lock className="h-2.5 w-2.5" />
                {tPuzzleDuJour("proBadge")}
              </span>
            )}
          </Link>
        </div>
      </div>
    </aside>
  );
}
