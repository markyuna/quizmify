import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Brain, CalendarCheck, Gamepad2 } from "lucide-react";

import { getGameByKey } from "@/lib/games/allGames";
import type { CommunityActivityItem } from "@/lib/community";
import { formatRelativeTime } from "@/lib/relativeTime";

// Seconds of scroll per item, so the strip moves at the same slow pace
// however many items it holds (the keyframe translates one full copy).
const SECONDS_PER_ITEM = 5;

type ResolvedItem = {
  id: string;
  kind: CommunityActivityItem["kind"];
  player: string;
  label: string;
  href: string;
  ago: string;
};

/**
 * Slow, continuous "who played what" strip under the community figures.
 * CSS-only marquee (`animate-marquee`, same idiom as CrucigramaExampleTopics):
 * the list is rendered twice so translating -50% loops seamlessly, it pauses
 * on hover/focus, and under prefers-reduced-motion the animation is off and
 * the `overflow-x-auto` container falls back to manual scrolling. The clone
 * copy is aria-hidden and untabbable. Each pill links to the quiz topic or
 * game it names. A render-time snapshot -- no polling.
 */
export default async function CommunityActivityTicker({ items }: { items: CommunityActivityItem[] }) {
  const t = await getTranslations("CommunitySection");
  const tRoot = await getTranslations();
  const locale = await getLocale();
  const nowIso = new Date().toISOString();

  const resolved = items
    .map((item): ResolvedItem | null => {
      const player = item.playerName ?? t("activityAnonymousPlayer");
      const ago = formatRelativeTime(item.playedAt, nowIso, locale);

      if (item.kind === "quiz" || item.kind === "daily-challenge") {
        if (!item.topic) return null;
        if (item.kind === "daily-challenge") {
          return {
            id: item.id,
            kind: item.kind,
            player,
            label: t("activityDailyChallenge", { topic: item.topic }),
            href: "/daily-challenge",
            ago,
          };
        }
        const params = new URLSearchParams({ topic: item.topic });
        if (item.categorySlug) params.set("category", item.categorySlug);
        return { id: item.id, kind: item.kind, player, label: item.topic, href: `/quiz?${params}`, ago };
      }

      const game = getGameByKey(item.kind);
      if (!game) return null;
      return {
        id: item.id,
        kind: item.kind,
        player,
        label: tRoot(`${game.i18nNamespace}.${game.i18nKey}`),
        href: game.href,
        ago,
      };
    })
    .filter((item): item is ResolvedItem => item !== null);

  if (resolved.length === 0) return null;

  return (
    <div className="mt-4 border-t border-slate-200/80 pt-4 dark:border-white/10">
      <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t("activityTitle")}</p>
      <div className="group overflow-hidden overflow-x-auto no-scrollbar">
        <ul
          className="animate-marquee flex w-max group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
          style={{ animationDuration: `${resolved.length * SECONDS_PER_ITEM}s` }}
        >
          {[...resolved, ...resolved].map((item, i) => {
            const isClone = i >= resolved.length;
            const Icon = item.kind === "quiz" ? Brain : item.kind === "daily-challenge" ? CalendarCheck : Gamepad2;
            return (
              <li key={`${item.id}-${i}`} className="shrink-0 pr-2" aria-hidden={isClone || undefined}>
                <Link
                  href={item.href}
                  tabIndex={isClone ? -1 : undefined}
                  className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span className="font-semibold text-slate-900 dark:text-white">{item.player}</span>
                  <span className="max-w-[14rem] truncate">{item.label}</span>
                  <span className="text-slate-400 dark:text-slate-500">· {item.ago}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
