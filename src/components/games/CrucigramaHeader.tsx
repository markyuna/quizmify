import { useTranslations } from "next-intl";

import { LETTER_COLORS } from "./PuzzleDuJourHeader";

/**
 * Header for the Crucigrama creation screen: the word "Crucigrama" with each
 * letter in a Quizmify brand colour, next to a bouncing mini crossword-grid
 * SVG, centred over the page background. Mirror of PuzzleDuJourHeader --
 * presentational only (no "use client", no state) so it renders in both
 * Server and Client trees.
 */

// 3x3 grid; three cells filled with the same three stops as the CTA button's
// violet -> fuchsia -> cyan gradient, the rest a theme-neutral translucent
// slate so the icon reads in both light and dark.
const GRID_OFFSET = 1.5;
const GRID_CELL = 6.5;
const GRID_GAP = 1.25;
const GRID_CELLS = [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => ({ row, col })));
const FILLED_CELLS: Record<string, string> = {
  "0,0": "#8b5cf6",
  "1,1": "#06b6d4",
  "2,2": "#ec4899",
};

function CrosswordGridIcon() {
  const pos = (i: number) => GRID_OFFSET + i * (GRID_CELL + GRID_GAP);

  return (
    <svg
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden="true"
      className="animate-puzzle-bounce h-14 w-14 shrink-0 drop-shadow-sm sm:h-20 sm:w-20"
    >
      {GRID_CELLS.map(({ row, col }) => {
        const fill = FILLED_CELLS[`${row},${col}`];
        return (
          <rect
            key={`${row}-${col}`}
            x={pos(col)}
            y={pos(row)}
            width={GRID_CELL}
            height={GRID_CELL}
            rx="1.25"
            fill={fill ?? "#94a3b8"}
            fillOpacity={fill ? 1 : 0.25}
          />
        );
      })}
    </svg>
  );
}

export default function CrucigramaHeader() {
  const t = useTranslations("CrucigramaPage");
  const title = t("title");

  return (
    <header className="px-4 pb-2 text-center">
      <div className="flex items-center justify-center gap-4">
        <CrosswordGridIcon />
        <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
          <span className="sr-only">{title}</span>
          {[...title].map((char, index) => (
            <span
              key={`${char}-${index}`}
              aria-hidden="true"
              style={{ color: LETTER_COLORS[index % LETTER_COLORS.length] }}
            >
              {char}
            </span>
          ))}
        </h1>
      </div>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400 sm:text-base">
        {t("description")}
      </p>
    </header>
  );
}
