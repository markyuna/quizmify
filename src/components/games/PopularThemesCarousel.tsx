"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Horizontal "popular themes" carousel for the Puzzle du Jour creation form.
 * A dumb component: it renders exactly what it is handed. The parent
 * (PuzzleDuJourCreation) owns the fetch and passes `themes` / `isLoading`.
 *
 * - isLoading -> skeleton pills, nav disabled, aria-busy.
 * - fewer than 2 themes -> renders nothing (a carousel of one is pointless).
 * - 2-4 themes -> a plain wrapping grid, no pagination.
 * - 5+ themes -> paginated carousel (2 per page on mobile, 4 on desktop).
 */

type PopularThemesCarouselProps = {
  /** Dynamic list from the API. */
  themes: string[];
  isLoading?: boolean;
  onThemeSelect: (theme: string) => void;
  currentTheme?: string;
  /** Mirrors the form's locked state -- greys the carousel out and blocks clicks. */
  disabled?: boolean;
};

const PAGINATION_THRESHOLD = 5;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

function useIsDesktop(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(min-width: 768px)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false
  );
}

function ThemeButton({
  theme,
  currentTheme,
  disabled,
  onThemeSelect,
}: {
  theme: string;
  currentTheme?: string;
  disabled: boolean;
  onThemeSelect: (theme: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onThemeSelect(theme)}
      aria-pressed={theme === currentTheme}
      className={cn(
        "truncate rounded-xl border px-2.5 py-2 text-xs font-medium transition-colors",
        theme === currentTheme
          ? "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500/50 dark:bg-violet-500/15 dark:text-violet-300"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
      )}
    >
      {theme}
    </button>
  );
}

export default function PopularThemesCarousel({
  themes,
  isLoading = false,
  onThemeSelect,
  currentTheme,
  disabled = false,
}: PopularThemesCarouselProps) {
  const t = useTranslations("PuzzleDuJour");
  const headingId = React.useId();

  const pageSize = useIsDesktop() ? 4 : 2;
  const paginated = !isLoading && themes.length >= PAGINATION_THRESHOLD;

  const pages = React.useMemo(
    () => (paginated ? chunk(themes, pageSize) : []),
    [paginated, themes, pageSize]
  );
  const pageCount = pages.length;

  const [page, setPage] = React.useState(0);
  // Clamp when a viewport change or a shorter `themes` shrinks the page count.
  const activePage = pageCount > 0 ? Math.min(page, pageCount - 1) : 0;

  const goTo = React.useCallback(
    (next: number) => setPage(Math.max(0, Math.min(next, pageCount - 1))),
    [pageCount]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(activePage - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(activePage + 1);
    }
  }

  // All hooks are above this line.
  if (!isLoading && themes.length < 2) return null;

  const navBtnClass =
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-500 transition hover:border-violet-300 hover:text-violet-600 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-violet-500/30 dark:hover:text-violet-300";

  return (
    <section
      aria-labelledby={headingId}
      aria-roledescription={paginated ? "carousel" : undefined}
      aria-busy={isLoading || undefined}
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white/70 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/5",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p id={headingId} className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {t("suggestionsLabel")}
        </p>
        {paginated && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(activePage - 1)}
              disabled={disabled || activePage === 0}
              aria-label={t("previousTheme")}
              className={navBtnClass}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => goTo(activePage + 1)}
              disabled={disabled || activePage >= pageCount - 1}
              aria-label={t("nextTheme")}
              className={navBtnClass}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <span className="sr-only">{t("loadingThemes")}</span>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-9 animate-pulse rounded-xl bg-slate-200/70 dark:bg-white/10"
            />
          ))}
        </div>
      ) : paginated ? (
        // Closed viewport -- nothing bleeds outside.
        <div
          className="overflow-hidden outline-none"
          tabIndex={disabled ? -1 : 0}
          role="group"
          aria-label={t("suggestionsLabel")}
          onKeyDown={handleKeyDown}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${activePage * 100}%)` }}
          >
            {pages.map((pageThemes, pageIndex) => (
              <div
                key={pageIndex}
                aria-hidden={pageIndex !== activePage}
                className={cn(
                  "grid w-full shrink-0 gap-2 transition-opacity duration-300",
                  pageSize === 2 ? "grid-cols-2" : "grid-cols-4",
                  pageIndex === activePage ? "opacity-100" : "opacity-40"
                )}
              >
                {pageThemes.map((theme) => (
                  <ThemeButton
                    key={theme}
                    theme={theme}
                    currentTheme={currentTheme}
                    disabled={disabled || pageIndex !== activePage}
                    onThemeSelect={onThemeSelect}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {themes.map((theme) => (
            <ThemeButton
              key={theme}
              theme={theme}
              currentTheme={currentTheme}
              disabled={disabled}
              onThemeSelect={onThemeSelect}
            />
          ))}
        </div>
      )}

      {paginated && pageCount > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {pages.map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              disabled={disabled}
              onClick={() => goTo(dotIndex)}
              aria-label={t("goToThemeGroup", { index: dotIndex + 1 })}
              aria-current={dotIndex === activePage}
              className={cn(
                "h-1.5 rounded-full transition-all",
                dotIndex === activePage
                  ? "w-4 bg-violet-500 dark:bg-violet-400"
                  : "w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-white/20 dark:hover:bg-white/30"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
