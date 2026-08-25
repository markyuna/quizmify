"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

type HeroMascotProps = {
  thinking: boolean;
  notFound: boolean;
  className?: string;
};

type MascotPose = "idle" | "thinking" | "notFound";

// Head/eye-row/torso anchor points below are hand-tuned to the 220x260
// viewBox -- keep transform-origin values in sync with the shapes if the
// SVG geometry ever changes.
export default function HeroMascot({ thinking, notFound, className }: HeroMascotProps) {
  const t = useTranslations("GuestGames");

  // Derived once so no element can ever render a combination its caller
  // didn't intend (e.g. both thinking and notFound true at once) --
  // notFound wins if somehow both are set.
  const pose: MascotPose = notFound ? "notFound" : thinking ? "thinking" : "idle";

  return (
    <div
      className={cn(
        "relative aspect-[220/260] origin-bottom",
        pose === "notFound" ? "animate-mascot-sway-subtle" : "animate-mascot-sway",
        className
      )}
    >
      <svg viewBox="0 0 220 260" className="h-full w-full" aria-hidden="true">
        {/* Torso -- top edge deliberately overlaps the head circle (which is
            painted after this, on top) so the two shapes read as one body
            instead of a snowman with a visible neck seam. */}
        <rect
          x="40"
          y="125"
          width="140"
          height="120"
          rx="40"
          className="fill-white stroke-violet-200 dark:fill-slate-900 dark:stroke-violet-800"
          strokeWidth="2"
        />

        {/* Antenna -- tip dims (opacity multiplier on the same pulse) in the
            notFound pose, full intensity otherwise. */}
        <line
          x1="110"
          y1="10"
          x2="110"
          y2="30"
          className="stroke-violet-400 dark:stroke-violet-500"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g
          className="transition-opacity duration-500"
          style={{ opacity: pose === "notFound" ? 0.5 : 1 }}
        >
          <circle
            cx="110"
            cy="8"
            r="6"
            className="animate-antenna-pulse fill-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)] dark:fill-cyan-300"
            style={{ transformOrigin: "110px 8px" }}
          />
        </g>

        {/* Head */}
        <circle
          cx="110"
          cy="95"
          r="70"
          className="fill-violet-100 stroke-violet-300 dark:fill-violet-950 dark:stroke-violet-700"
          strokeWidth="2"
        />

        {/* Eyebrows */}
        <line
          x1="70"
          y1={pose === "thinking" ? 62 : pose === "notFound" ? 66 : 68}
          x2="95"
          y2={pose === "thinking" ? 76 : pose === "notFound" ? 80 : 64}
          className="stroke-slate-700 transition-all duration-500 dark:stroke-slate-200"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1="125"
          y1={pose === "thinking" ? 76 : pose === "notFound" ? 80 : 64}
          x2="150"
          y2={pose === "thinking" ? 62 : pose === "notFound" ? 66 : 68}
          className="stroke-slate-700 transition-all duration-500 dark:stroke-slate-200"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Eyes -- blink in idle/thinking, squint (static, no blink) in notFound */}
        <g
          className={cn(
            "transition-transform duration-500",
            pose === "notFound" ? "scale-y-50" : "animate-mascot-blink"
          )}
          style={{ transformOrigin: "110px 92px" }}
        >
          <circle cx="85" cy="92" r="8" className="fill-slate-800 dark:fill-slate-100" />
          <circle cx="135" cy="92" r="8" className="fill-slate-800 dark:fill-slate-100" />
        </g>

        {/* Sad-face extras (frown + falling tear) -- always mounted, opacity-
            toggled like the thinking bubble below, never mount/unmount. */}
        <g
          className={cn(
            "transition-opacity duration-500",
            pose === "notFound" ? "opacity-100" : "opacity-0"
          )}
        >
          <path
            d="M 85 132 Q 110 120 135 132"
            className="stroke-slate-700 dark:stroke-slate-200"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <circle
            cx="85"
            cy="104"
            r="3.5"
            className="animate-tear-drop fill-cyan-400 dark:fill-cyan-300"
          />
        </g>

        {/* Magnifying glass: orbits the head in idle, parks at the temple
            while thinking. Outer <g> positions it, inner <g> only carries
            the tremble keyframe so the two transforms don't clobber each other. */}
        <g
          className={cn(
            "transition-transform duration-500",
            pose !== "thinking" && "animate-magnifier-orbit"
          )}
          style={{
            transformOrigin: "110px 95px",
            transform: pose === "thinking" ? "translate(150px, 70px) rotate(-15deg)" : undefined,
          }}
        >
          <g className={pose === "thinking" ? "animate-magnifier-tremble" : undefined}>
            <circle
              cx="0"
              cy="0"
              r="10"
              className="fill-cyan-50/60 stroke-cyan-500 dark:fill-cyan-400/10 dark:stroke-cyan-300"
              strokeWidth="3"
            />
            <line
              x1="7"
              y1="7"
              x2="15"
              y2="15"
              className="stroke-cyan-500 dark:stroke-cyan-300"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>

      {/* AI badge */}
      <div
        className={cn(
          "animate-badge-glow pointer-events-none absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2",
          "rounded-full border border-cyan-400/60 bg-white/90 px-3 py-0.5 text-[11px] font-bold tracking-wide text-cyan-700",
          "dark:border-cyan-300/50 dark:bg-slate-900/80 dark:text-cyan-300"
        )}
      >
        {t("mascotAiLabel")}
      </div>

      {/* Thinking bubble */}
      <div
        className={cn(
          "pointer-events-none absolute -right-1 top-2 flex items-center gap-1 rounded-2xl rounded-bl-sm border px-3 py-2 shadow-md transition-all duration-300",
          "border-violet-200 bg-white dark:border-violet-800 dark:bg-slate-900",
          pose === "thinking" ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-75 opacity-0"
        )}
      >
        <span
          className="animate-thinking-dot h-1.5 w-1.5 rounded-full bg-violet-400 dark:bg-violet-300"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="animate-thinking-dot h-1.5 w-1.5 rounded-full bg-violet-400 dark:bg-violet-300"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="animate-thinking-dot h-1.5 w-1.5 rounded-full bg-violet-400 dark:bg-violet-300"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
