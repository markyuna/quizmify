"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { Trophy as TrophyIcon, Medal, Star, Crown } from "lucide-react";
import { useTranslations } from "next-intl";

import TrophyModal from "@/components/trophy/TrophyModal";
import { getTrophyShape, type TrophyShape } from "@/lib/trophyTiers";
import type { TrophyReason } from "@/app/api/quiz/submit/route";

export type TrophyItem = {
  id: string;
  kind: Exclude<TrophyReason, null>;
  streakCount: number | null;
  createdAt: Date;
  topic: string | null;
};

const STYLES: Record<TrophyShape, { icon: typeof TrophyIcon; classes: string }> = {
  cup: {
    icon: TrophyIcon,
    classes: "border-amber-300/50 bg-amber-50/70 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  },
  medal: {
    icon: Medal,
    classes: "border-orange-300/50 bg-orange-50/70 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
  },
  star: {
    icon: Star,
    classes: "border-violet-300/50 bg-violet-50/70 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  },
  crown: {
    icon: Crown,
    classes: "border-yellow-300/50 bg-yellow-50/70 text-yellow-600 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300",
  },
};

export default function TrophyGrid({ trophies }: { trophies: TrophyItem[] }) {
  const t = useTranslations("TrophyCabinet");
  const [selected, setSelected] = React.useState<TrophyItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {trophies.map((trophy) => {
          const shape = getTrophyShape(trophy.kind, trophy.streakCount);
          const style = STYLES[shape];
          const Icon = style.icon;
          const label =
            trophy.kind === "perfect" ? t("perfectLabel") : t("streakLabel", { count: trophy.streakCount ?? 0 });

          return (
            <button
              key={trophy.id}
              type="button"
              onClick={() => setSelected(trophy)}
              title={`${label} · ${trophy.topic ?? t("unknownTopic")} · ${new Date(trophy.createdAt).toLocaleDateString()}`}
              className={`group flex flex-col items-center gap-1 rounded-xl border p-1.5 text-center transition-transform duration-200 hover:-translate-y-0.5 ${style.classes}`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 shadow-sm dark:bg-white/10">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 w-full">
                <p className="truncate text-[10px] font-bold leading-tight">{label}</p>
                <p className="truncate text-[9px] leading-tight text-muted-foreground">
                  {trophy.topic ?? t("unknownTopic")}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <TrophyModal
            reason={selected.kind}
            streakCount={selected.streakCount ?? 0}
            autoDismissMs={0}
            trophySize={140}
            compact
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
