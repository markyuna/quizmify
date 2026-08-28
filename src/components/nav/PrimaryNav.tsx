"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, Menu, PawPrint, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCategoriesGroupedByGroup } from "@/lib/categories";
import { GAMES_CATALOG } from "@/lib/games/catalog";
import { buttonVariants } from "@/components/ui/button";
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
  isLoggedIn: boolean;
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

const mobileLinkClass =
  "flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white";

// Same accordion idiom as CategorySidebar.tsx's CategoryGroupDisclosure
// (useState + ChevronDown rotate-180) -- there is no Radix Accordion in
// the project.
function MobileDisclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-slate-200/80 py-1 last:border-0 dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-2.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-100"
      >
        {label}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

export default function PrimaryNav({ isPro, isLoggedIn }: PrimaryNavProps) {
  const t = useTranslations("Navbar");
  const tGroups = useTranslations("CategoryGroups");
  const tCategories = useTranslations("Categories");
  const tGuestGames = useTranslations("GuestGames");
  const tPuzzle = useTranslations("PuzzleDuJour");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const closeMobile = React.useCallback(() => setMobileOpen(false), []);

  return (
    <>
      {/* Desktop */}
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

      {/* Mobile: hamburger toggles a full-width panel anchored to the fixed
          <header> (nearest positioned ancestor). */}
      <button
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-700 transition hover:bg-slate-100 md:hidden dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-slate-200/80 bg-white/95 px-4 pb-4 pt-2 shadow-lg backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-slate-950/95">
          <MobileDisclosure label={t("categories")}>
            <div className="space-y-3">
              {GROUPED_CATEGORIES.map((entry) => (
                <div key={entry.group}>
                  <p className="px-1 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    {tGroups(entry.group)}
                  </p>
                  <ul className="space-y-0.5">
                    {entry.categories.map((category) => (
                      <li key={category.slug}>
                        <Link
                          href={`/quiz/categoria/${category.slug}`}
                          onClick={closeMobile}
                          className={mobileLinkClass}
                        >
                          <span aria-hidden="true">{category.icon}</span>
                          <span>{tCategories(`${category.slug}.name`)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </MobileDisclosure>

          <MobileDisclosure label={t("games")}>
            <ul className="space-y-0.5">
              {GAMES_CATALOG.map((game) => (
                <li key={game.key}>
                  <Link
                    href={`/games?game=${game.key}`}
                    onClick={closeMobile}
                    className={mobileLinkClass}
                  >
                    {tGuestGames(game.titleKey)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/puzzle-du-jour"
                  onClick={closeMobile}
                  className={cn(mobileLinkClass, "justify-between")}
                >
                  <span>{tPuzzle("title")}</span>
                  <span className={proBadgeClass}>{t("proBadge")}</span>
                </Link>
              </li>
              <li>
                <Link
                  href={QUI_EST_LE_PEINTRE_HREF}
                  onClick={closeMobile}
                  className={mobileLinkClass}
                >
                  {t("quiEstLePeintre")}
                </Link>
              </li>
            </ul>
          </MobileDisclosure>

          <Link
            href="/quel-animal-es-tu"
            onClick={closeMobile}
            className={cn(
              mobileLinkClass,
              "mt-1 font-semibold text-slate-800 dark:text-slate-100"
            )}
          >
            <PawPrint className="h-4 w-4 text-slate-400" />
            <span>{t("whichAnimal")}</span>
          </Link>

          {!isPro && (
            <Link
              href="/upgrade"
              onClick={closeMobile}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white"
            >
              <Sparkles className="h-4 w-4" />
              {t("goPro")}
            </Link>
          )}

          {/* Guests only -- on desktop this lives in the header (Navbar.tsx),
              here it's the drawer's closing CTA. border-t sits on the wrapper
              so it reads as a section divider, not a button edge. */}
          {!isLoggedIn && (
            <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-white/10">
              <Link
                href="/login"
                onClick={closeMobile}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                {t("signIn")}
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
