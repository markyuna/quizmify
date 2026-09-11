import { useTranslations } from "next-intl";

import { LETTER_COLORS } from "./PuzzleDuJourHeader";

/**
 * Header for the "Qui est le peintre?" creation screen: the game title with
 * the word "peintre" spelled in Quizmify brand colours, next to a bouncing
 * framed-canvas SVG. Mirror of CrucigramaHeader / PuzzleDuJourHeader --
 * presentational only (no "use client", no state) so it renders in both
 * Server and Client trees.
 */

function FramedCanvasIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden="true"
      className="animate-puzzle-bounce h-14 w-14 shrink-0 drop-shadow-sm sm:h-20 sm:w-20"
    >
      {/* frame */}
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#f59e0b" />
      <rect x="4" y="4" width="16" height="16" rx="1" fill="#fdf6e3" />
      {/* three dabs of paint */}
      <circle cx="9" cy="9" r="2.4" fill="#8b5cf6" />
      <circle cx="15" cy="11" r="2.4" fill="#06b6d4" />
      <circle cx="11" cy="15.5" r="2.4" fill="#ec4899" />
    </svg>
  );
}

export default function PeintreHeader() {
  const t = useTranslations("Peintre");
  const title = t("title");
  const brandWord = t("titleBrandWord");
  const idx = title.toLowerCase().indexOf(brandWord.toLowerCase());
  const before = idx >= 0 ? title.slice(0, idx) : title;
  const word = idx >= 0 ? title.slice(idx, idx + brandWord.length) : "";
  const after = idx >= 0 ? title.slice(idx + brandWord.length) : "";

  return (
    <header className="px-4 pb-2 text-center">
      <div className="flex items-center justify-center gap-4">
        <FramedCanvasIcon />
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
          <span className="sr-only">{title}</span>
          <span aria-hidden="true" className="text-slate-900 dark:text-white">
            {before}
          </span>
          {[...word].map((char, index) => (
            <span
              key={`${char}-${index}`}
              aria-hidden="true"
              style={{ color: LETTER_COLORS[index % LETTER_COLORS.length] }}
            >
              {char}
            </span>
          ))}
          <span aria-hidden="true" className="text-slate-900 dark:text-white">
            {after}
          </span>
        </h1>
      </div>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400 sm:text-base">
        {t("description")}
      </p>
    </header>
  );
}
