"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { User } from "next-auth";
import { useTranslations } from "next-intl";
import { ChevronDown, LayoutGrid, LogOut, Menu, PawPrint, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCategoriesGroupedByGroup } from "@/lib/categories";
import { ALL_GAMES } from "@/lib/games/allGames";
import { ACCOUNT_LINKS } from "./accountLinks";
import GameCard from "@/components/games/GameCard";
import UserAvatar from "@/components/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const GROUPED_CATEGORIES = getCategoriesGroupedByGroup();

// "/games" is reachable from the "Games" accordion's first row on mobile,
// so it's dropped from the account section here to avoid listing it twice.
// ACCOUNT_LINKS itself (and the desktop UserAccountNav) keep it.
const MOBILE_ACCOUNT_LINKS = ACCOUNT_LINKS.filter((link) => link.href !== "/games");

// Tailwind's `md` breakpoint -- the trigger is md:hidden, so an open menu
// must not survive a resize/rotation past it.
const DESKTOP_QUERY = "(min-width: 768px)";

type MobileMenuProps = {
  isPro: boolean;
  isLoggedIn: boolean;
  user: Pick<User, "name" | "image"> | null;
};

const itemClass =
  "cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus:bg-white/10";

const separatorClass = "bg-slate-200 dark:bg-white/10";

/**
 * Accordion toggle as a DropdownMenuItem rather than a plain <button>:
 * Radix's DropdownMenuContent swallows Tab entirely and only
 * DropdownMenuItem takes part in its arrow-key roving focus. onSelect's
 * preventDefault keeps the whole menu open while a section expands.
 */
function DisclosureItem({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          onToggle();
        }}
        aria-expanded={isOpen}
        className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10 dark:focus:bg-white/10"
      >
        {label}
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")}
        />
      </DropdownMenuItem>
      {isOpen && <div className="space-y-0.5 py-1">{children}</div>}
    </>
  );
}

/**
 * The menu's contents. Lives in its own component, rendered inside
 * DropdownMenuContent, so the accordion state is owned by something Radix
 * unmounts on close -- every close (Esc, outside click, link selection,
 * route change, crossing the md breakpoint) starts the next open fully
 * collapsed, without a reset effect.
 */
function MobileMenuBody({ isPro, isLoggedIn, user }: MobileMenuProps) {
  const tNavbar = useTranslations("Navbar");
  const tGroups = useTranslations("CategoryGroups");
  const tCategories = useTranslations("Categories");
  const tUserMenu = useTranslations("UserMenu");
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);
  const [gamesOpen, setGamesOpen] = React.useState(false);

  return (
    <>
      {isLoggedIn && user && (
        <>
          <div className="flex items-center gap-3 rounded-2xl px-3 py-3">
            <UserAvatar
              className="h-11 w-11 border border-slate-200 shadow-sm dark:border-white/10 dark:shadow-none"
              user={{ name: user.name || null, image: user.image || null }}
            />
            <div className="min-w-0 flex-1">
              {user.name && (
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
              )}
              {isPro && (
                <span className="mt-0.5 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                  {tNavbar("proBadge")}
                </span>
              )}
            </div>
          </div>
          <DropdownMenuSeparator className={separatorClass} />
        </>
      )}

      <DisclosureItem
        label={tNavbar("categories")}
        isOpen={categoriesOpen}
        onToggle={() => setCategoriesOpen((v) => !v)}
      >
        {GROUPED_CATEGORIES.map((entry) => (
          <React.Fragment key={entry.group}>
            <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              {tGroups(entry.group)}
            </p>
            {entry.categories.map((category) => (
              <DropdownMenuItem key={category.slug} asChild className={itemClass}>
                <Link href={`/quiz/categoria/${category.slug}`} className="flex items-center gap-2.5">
                  <span aria-hidden="true">{category.icon}</span>
                  <span>{tCategories(`${category.slug}.name`)}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DisclosureItem>

      <DisclosureItem label={tNavbar("games")} isOpen={gamesOpen} onToggle={() => setGamesOpen((v) => !v)}>
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/games" className="flex items-center gap-2.5 font-semibold">
            <LayoutGrid className="h-4 w-4 text-slate-400" />
            {tNavbar("allGames")}
          </Link>
        </DropdownMenuItem>
        {ALL_GAMES.map((game) => (
          <DropdownMenuItem key={game.key} asChild className={itemClass}>
            <Link href={game.href}>
              <GameCard game={game} isPro={isPro} variant="dropdown" />
            </Link>
          </DropdownMenuItem>
        ))}
      </DisclosureItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/quel-animal-es-tu" className="flex items-center gap-2.5">
          <PawPrint className="h-4 w-4 text-slate-400" />
          {tNavbar("whichAnimal")}
        </Link>
      </DropdownMenuItem>

      {!isPro && (
        <DropdownMenuItem
          asChild
          className="mt-1 cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-2.5 text-sm font-bold text-white outline-none transition hover:opacity-95 focus:opacity-95"
        >
          <Link href="/upgrade" className="flex items-center justify-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            {tNavbar("goPro")}
          </Link>
        </DropdownMenuItem>
      )}

      <DropdownMenuSeparator className={separatorClass} />

      {isLoggedIn ? (
        <>
          {MOBILE_ACCOUNT_LINKS.map((link) => (
            <DropdownMenuItem key={link.href} asChild className={itemClass}>
              <Link href={link.href} className="flex items-center gap-2.5">
                <link.icon className="h-4 w-4" />
                <span>{tUserMenu(link.labelKey)}</span>
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              signOut().catch(console.error);
            }}
            className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 outline-none transition hover:bg-rose-50 focus:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:focus:bg-rose-500/10"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="h-4 w-4" />
              {tUserMenu("signOut")}
            </div>
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-800 outline-none transition hover:bg-slate-100 focus:bg-slate-100 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10 dark:focus:bg-white/10"
        >
          <Link href="/login" className="flex justify-center">
            {tNavbar("signIn")}
          </Link>
        </DropdownMenuItem>
      )}
    </>
  );
}

/**
 * Mobile-only (below md) single menu: navigation plus, when signed in, the
 * account section that UserAccountNav provides on desktop. No shared
 * "only one panel open" state with NotificationBell is needed: both are
 * modal={false} Radix menus, and Radix's DismissableLayer dismisses an open
 * menu on any document pointerdown outside its content -- including on the
 * other menu's trigger -- before that trigger's own toggle runs.
 */
export default function MobileMenu(props: MobileMenuProps) {
  const tNavbar = useTranslations("Navbar");
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Radix knows nothing about Next's router, so a route change (including
  // browser back/forward, which never touches the menu) closes it here.
  // Adjusting state during render rather than in an effect, per React's
  // "storing information from previous renders" pattern.
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    // modal={false}: same reasoning as every other header dropdown -- avoid
    // react-remove-scroll's body-scroll lock shifting the layout.
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={open ? tNavbar("closeMenu") : tNavbar("openMenu")}
          aria-expanded={open}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/70 backdrop-blur-md shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md md:hidden dark:border-white/10 dark:bg-white/10"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-80 max-w-[90vw] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85"
      >
        <MobileMenuBody {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
