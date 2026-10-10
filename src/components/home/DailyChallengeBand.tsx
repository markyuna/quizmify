import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Flame } from "lucide-react";

import { GameImage } from "@/components/games/GameCard";
import { ALL_GAMES } from "@/lib/games/allGames";
import type { DailyChallengeSpotlight } from "@/lib/community";
import { formatRelativeTime } from "@/lib/relativeTime";

/**
 * Daily-challenge block of the homepage community band: today's topic, the
 * score of the most recent player (when there is one), a call to action, and
 * shortcuts to the other games. Presentational -- the data comes from
 * getDailyChallengeSpotlight() in CommunitySection.
 *
 * The CTA always points at /daily-challenge: that page already redirects
 * anonymous visitors to /login and shows the "already played" result to
 * players who finished, so the band needs no per-user query. The game
 * shortcuts deliberately carry no Neuron/Pro badge -- each destination route
 * owns its own access gating (see GameCard).
 */
export default async function DailyChallengeBand({ spotlight }: { spotlight: DailyChallengeSpotlight | null }) {
  const t = await getTranslations("CommunitySection");
  const tRoot = await getTranslations();
  const locale = await getLocale();

  const last = spotlight?.lastPlayer ?? null;
  const lastLine = last
    ? t("dailyChallengeLastScore", {
        player: last.name ?? t("activityAnonymousPlayer"),
        score: last.score,
        ago: formatRelativeTime(last.playedAt, new Date().toISOString(), locale),
      })
    : t("dailyChallengeBeFirst");

  return (
    <div className="mt-4 border-t border-slate-200/80 pt-4 dark:border-white/10">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-300">
            <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t("dailyChallengeBadge")}
          </p>
          {spotlight && (
            <p className="truncate text-base font-bold text-slate-900 dark:text-white">{spotlight.topic}</p>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {lastLine}
            {last && <span className="font-semibold"> {t("dailyChallengeBeat")}</span>}
          </p>
        </div>
        <Link
          href="/daily-challenge"
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition-opacity hover:opacity-90"
        >
          {t("dailyChallengePlay")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="mb-2 mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
        {t("dailyChallengeMoreGames")}
      </p>
      <ul className="flex flex-wrap gap-2">
        {ALL_GAMES.map((game) => (
          <li key={game.key}>
            <Link
              href={game.href}
              className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/10"
            >
              <GameImage game={game} className="h-6 w-6" />
              {tRoot(`${game.i18nNamespace}.${game.i18nKey}`)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
