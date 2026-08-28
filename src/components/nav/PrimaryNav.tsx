"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, PawPrint, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCategoriesGroupedByGroup } from "@/lib/categories";
import { GAMES_CATALOG } from "@/lib/games/catalog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Computed once from static config -- same idiom as CategorySidebar.tsx.
const GROUPED_CATEGORIES = getCategoriesGroupedByGroup();

// "Qui est le peintre?" is a curated quiz (not a GAMES_CATALOG game): it
// launches through the normal quiz-creation screen with topic+category
// prefilled, exactly like CategoryQuizCard.tsx does. The topic text is the
// curated definition's canonical topicDisplay, never a translated label.
const QUI_EST_LE_PEINTRE_HREF = `/quiz?topic=${encodeURIComponent(
  "Qui est le peintre?"
)}&category=arts`;

type PrimaryNavProps = {
  isPro: boolean;
};

const triggerClass =
  "inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white";

// Mirrors UserAccountNav.tsx's dropdown look (rounded-2xl, backdrop-blur-xl,
// bg-white/95 + dark:bg-slate-950/85) for visual consistency.
const contentClass =
  "w-64 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85";

const itemClass =
  "cursor-pointer rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus:bg-white/10";

const proBadgeClass =
  "rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-500/20 dark:text-violet-300";

export default function PrimaryNav({ isPro }: PrimaryNavProps) {
  const t = useTranslations("Navbar");
  const tGroups = useTranslations("CategoryGroups");
  const tCategories = useTranslations("Categories");
  const tGuestGames = useTranslations("GuestGames");
  const tPuzzle = useTranslations("PuzzleDuJour");

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      {/* Categories */}
      <DropdownMenu>
        <DropdownMenuTrigger className={triggerClass}>
          {t("categories")}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn(contentClass, "max-h-[70vh] overflow-y-auto")}
        >
          {GROUPED_CATEGORIES.map((entry, index) => (
            <React.Fragment key={entry.group}>
              {index > 0 && (
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
              )}
              <DropdownMenuLabel className="text-slate-400 dark:text-slate-500">
                {tGroups(entry.group)}
              </DropdownMenuLabel>
              {entry.categories.map((category) => (
                <DropdownMenuItem key={category.slug} asChild className={itemClass}>
                  <Link
                    href={`/quiz/categoria/${category.slug}`}
                    className="flex items-center gap-2.5"
                  >
                    <span aria-hidden="true">{category.icon}</span>
                    <span>{tCategories(`${category.slug}.name`)}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Games */}
      <DropdownMenu>
        <DropdownMenuTrigger className={triggerClass}>
          {t("games")}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={contentClass}>
          {GAMES_CATALOG.map((game) => (
            <DropdownMenuItem key={game.key} asChild className={itemClass}>
              <Link href={`/games?game=${game.key}`}>{tGuestGames(game.titleKey)}</Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem asChild className={itemClass}>
            <Link
              href="/puzzle-du-jour"
              className="flex items-center justify-between gap-2"
            >
              <span>{tPuzzle("title")}</span>
              <span className={proBadgeClass}>{t("proBadge")}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={itemClass}>
            <Link href={QUI_EST_LE_PEINTRE_HREF}>{t("quiEstLePeintre")}</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Standalone link */}
      <Link href="/quel-animal-es-tu" className={cn(triggerClass, "gap-2.5")}>
        <PawPrint className="h-4 w-4 text-slate-400" />
        {t("whichAnimal")}
      </Link>

      {/* Hidden entirely for users who already are Pro. */}
      {!isPro && (
        <Link
          href="/upgrade"
          className="ml-1 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
        >
          <Sparkles className="h-4 w-4" />
          {t("goPro")}
        </Link>
      )}
    </nav>
  );
}
