"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PawPrint, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type PrimaryNavProps = {
  isPro: boolean;
};

// Shared trigger/link look for the desktop bar. gap-2.5 + h-4 w-4 icons
// keep every row aligned with the emoji <span> spacing used inside the
// Categories dropdown items (added in the next commit).
const triggerClass =
  "inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white";

export default function PrimaryNav({ isPro }: PrimaryNavProps) {
  const t = useTranslations("Navbar");

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
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
