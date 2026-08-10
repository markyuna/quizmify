"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { TILE_CLASSES, type LetterStatus } from "./WordOfDayCard";

const STEP_COUNT = 3;

const LEGEND: Array<{ status: LetterStatus; sampleLetter: string }> = [
  { status: "correct", sampleLetter: "S" },
  { status: "present", sampleLetter: "T" },
  { status: "absent", sampleLetter: "X" },
];

// Fixed illustrative word -- not a real challenge answer, so it isn't
// translated. Statuses are hand-picked to show all 3 outcomes at once,
// matching the "PALKÁS" example in the design spec.
const EXAMPLE_WORD: Array<{ letter: string; status: LetterStatus }> = [
  { letter: "P", status: "absent" },
  { letter: "A", status: "present" },
  { letter: "L", status: "correct" },
  { letter: "K", status: "absent" },
  { letter: "A", status: "correct" },
  { letter: "S", status: "present" },
];

function Tile({ letter, status, size = "sm" }: { letter: string; status: LetterStatus; size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border font-bold uppercase",
        size === "md" ? "h-10 w-10 text-base" : "h-8 w-8 text-sm",
        TILE_CLASSES[status]
      )}
    >
      {letter}
    </div>
  );
}

export default function WordOfDayGuide() {
  const t = useTranslations("GuestGames.wordOfDay.guide");
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-slate-900 dark:text-white">{t("title")}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
        <span className="sr-only">{isOpen ? t("hide") : t("show")}</span>
      </button>

      {isOpen && (
        <div className="space-y-5 border-t border-slate-200/80 px-4 py-4 dark:border-white/10">
          {/* Section 1: how to play, 3 numbered steps */}
          <div className="space-y-2">
            {Array.from({ length: STEP_COUNT }, (_, index) => index + 1).map((step) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  {step}
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-300">{t(`step${step}`)}</p>
              </div>
            ))}
          </div>

          {/* Section 2: color legend */}
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("colorsTitle")}
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {LEGEND.map(({ status, sampleLetter }) => (
                <div
                  key={status}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 dark:border-white/10 dark:bg-white/5"
                >
                  <Tile letter={sampleLetter} status={status} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {t(`legend.${status}Label`)}
                    </p>
                    <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                      {t(`legend.${status}Desc`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: worked example */}
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("exampleTitle")}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_WORD.map((cell, index) => (
                <Tile key={index} letter={cell.letter} status={cell.status} size="md" />
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t("exampleCaption")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
