"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RecentGame = {
  id: string;
  status: "won" | "lost" | "draw";
  difficulty: "easy" | "medium" | "hard";
};

type Stats = {
  total: number;
  winRate: number;
  avgWinRate: number;
  lastGames: RecentGame[];
};

const RESULT_KEY: Record<RecentGame["status"], "resultWon" | "resultLost" | "resultDraw"> = {
  won: "resultWon",
  lost: "resultLost",
  draw: "resultDraw",
};

const RESULT_TONE: Record<RecentGame["status"], string> = {
  won: "text-emerald-500",
  lost: "text-red-500",
  draw: "text-amber-500",
};

type MorpionStatsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function MorpionStatsModal({ open, onOpenChange }: MorpionStatsModalProps) {
  const t = useTranslations("MorpionStats");
  const tDiff = useTranslations("MorpionPage.difficulty");

  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch("/api/morpion/stats")
      .then((r) => {
        if (!r.ok) throw new Error("stats failed");
        return r.json();
      })
      .then((data: Stats) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        )}

        {!loading && error && (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">{t("loadError")}</p>
        )}

        {!loading && !error && stats && (
          <div className="space-y-4">
            {stats.total === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">{t("empty")}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 p-3 text-center dark:border-white/10">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("total")}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3 text-center dark:border-white/10">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("winRate")}</p>
                    <p className="text-xl font-bold text-emerald-500">{pct(stats.winRate)}</p>
                    <p className="text-[11px] text-slate-400">
                      {t("avg")}: {pct(stats.avgWinRate)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {t("recent")}
                  </p>
                  <ul className="space-y-1.5">
                    {stats.lastGames.map((g) => (
                      <li
                        key={g.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-white/10"
                      >
                        <span className={cn("font-semibold", RESULT_TONE[g.status])}>
                          {t(RESULT_KEY[g.status])}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {tDiff(g.difficulty)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {!loading && (
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            {t("close")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
