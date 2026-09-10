"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Auto-scrolling "example topics" strip for the Crucigrama creation form.
 * One continuous horizontal marquee (CSS `animate-marquee`), paused on hover
 * or keyboard focus -- no prev/next pagination. Each pill is click-to-fill:
 * it calls `onSelect` with its label and never submits the form
 * (`type="button"`).
 *
 * The list is rendered twice back-to-back so the keyframe can translate one
 * full copy (-50%) and loop seamlessly; the spacing lives on each item
 * (`pr-2`) rather than a flex `gap` so -50% lands exactly on a copy boundary.
 * The second copy is aria-hidden / not tabbable so screen readers and the
 * tab order see each topic once.
 *
 * `overflow-x-auto no-scrollbar` on the container is the reduced-motion
 * fallback: when the marquee animation is disabled the pills still overflow,
 * so manual scrolling keeps all of them reachable.
 */

type CrucigramaExampleTopicsProps = {
  onSelect: (topic: string) => void;
};

// Border tint rotated by position -- mirrors the unselected-pill look from
// PopularThemesCarousel (Puzzle du Jour) so the two forms feel related.
const TOPIC_BORDER_ROTATION = [
  "border-cyan-300/40 dark:border-cyan-500/30",
  "border-fuchsia-300/40 dark:border-fuchsia-500/30",
  "border-violet-300/30 dark:border-violet-500/20",
];

export default function CrucigramaExampleTopics({ onSelect }: CrucigramaExampleTopicsProps) {
  const t = useTranslations("CrucigramaPage");
  const topics = t.raw("exampleTopics") as string[];

  if (topics.length === 0) return null;

  return (
    <div className="group mt-3 overflow-hidden overflow-x-auto no-scrollbar">
      <ul className="animate-marquee flex w-max group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
        {[...topics, ...topics].map((topic, i) => {
          const isClone = i >= topics.length;
          return (
            <li key={`${topic}-${i}`} className="shrink-0 pr-2" aria-hidden={isClone || undefined}>
              <button
                type="button"
                tabIndex={isClone ? -1 : undefined}
                onClick={() => onSelect(topic)}
                className={cn(
                  "truncate rounded-xl border bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:bg-white/5 dark:text-slate-300 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10 dark:hover:text-violet-300",
                  TOPIC_BORDER_ROTATION[i % TOPIC_BORDER_ROTATION.length]
                )}
              >
                {topic}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
