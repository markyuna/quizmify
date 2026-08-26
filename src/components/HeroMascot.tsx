"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

type HeroMascotProps = {
  thinking: boolean;
  notFound: boolean;
  attention: boolean;
  className?: string;
};

type MascotPose = "idle" | "thinking" | "notFound" | "attention";

// Eyebrow endpoints per pose -- outerY is the x=70/150 end (away from the
// nose), innerY is the x=95/125 end (toward the nose). Furrowed (thinking)
// pulls the inner end down; drooping (notFound) pulls it down further;
// attention is a level, neutral brow, distinct from idle's slightly-relaxed
// outer-up angle.
const EYEBROW_ANGLE: Record<MascotPose, { outerY: number; innerY: number }> = {
  idle: { outerY: 68, innerY: 64 },
  thinking: { outerY: 62, innerY: 76 },
  notFound: { outerY: 66, innerY: 80 },
  attention: { outerY: 66, innerY: 66 },
};

// Head/eye-row/torso anchor points below are hand-tuned to the 220x260
// viewBox -- keep transform-origin values in sync with the shapes if the
// SVG geometry ever changes.
export default function HeroMascot({ thinking, notFound, attention, className }: HeroMascotProps) {
  const t = useTranslations("GuestGames");
  const uid = useId();
  const headClipId = `mascot-head-clip-${uid}`;
  const torsoGradientId = `mascot-torso-gradient-${uid}`;
  const headShadowId = `mascot-head-shadow-${uid}`;
  const headHighlightId = `mascot-head-highlight-${uid}`;

  // Derived once so no element can ever render a combination its caller
  // didn't intend (e.g. attention and notFound both true at once) --
  // notFound wins over thinking, which wins over attention.
  const pose: MascotPose = notFound ? "notFound" : thinking ? "thinking" : attention ? "attention" : "idle";
  const eyebrow = EYEBROW_ANGLE[pose];

  return (
    <div
      className={cn(
        "relative aspect-[220/260] origin-bottom",
        pose === "notFound"
          ? "animate-mascot-sway-subtle"
          : pose === "attention"
            ? "animate-mascot-lean-right"
            : "animate-mascot-sway",
        className
      )}
    >
      {/* overflow-visible: lets the attention-pose arm/hand reach past the
          viewBox's right edge without being clipped, without having to
          widen the viewBox itself (which would shift every %-based overlay
          below -- the AI badge, thinking bubble -- off the head/torso they're
          centered on). */}
      <svg viewBox="0 0 220 260" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <clipPath id={headClipId}>
            <circle cx="110" cy="95" r="70" />
          </clipPath>
          {/* Same violet/slate ramp as the torso's previous flat fill, just
              split into two stops -- lighter at the top (catching light),
              matching the head's own shading direction below. */}
          <linearGradient id={torsoGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="[stop-color:var(--color-white)] dark:[stop-color:var(--color-slate-800)]" />
            <stop
              offset="100%"
              className="[stop-color:var(--color-violet-50)] dark:[stop-color:var(--color-slate-900)]"
            />
          </linearGradient>
          {/* Radial, not flat -- fades to fully transparent at the edge so
              the head shading reads as soft depth instead of a hard-edged
              gray oval sitting on top of the fill (that's what a flat-fill
              ellipse looked like in light mode). */}
          <radialGradient id={headShadowId}>
            <stop offset="0%" stopColor="black" stopOpacity="0.35" />
            <stop offset="100%" stopColor="black" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={headHighlightId}>
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Torso -- top edge deliberately overlaps the head circle (which is
            painted after this, on top) so the two shapes read as one body
            instead of a snowman with a visible neck seam. */}
        <rect
          x="40"
          y="125"
          width="140"
          height="120"
          rx="40"
          fill={`url(#${torsoGradientId})`}
          className="stroke-violet-200 dark:stroke-violet-800"
          strokeWidth="2"
        />

        {/* Antenna -- outer/inner concentric circles pulse together as one
            unit; the whole antenna dims (opacity multiplier) in notFound. */}
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
          <g className="animate-antenna-pulse" style={{ transformOrigin: "110px 8px" }}>
            <circle
              cx="110"
              cy="8"
              r="6"
              className="fill-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)] dark:fill-cyan-300"
            />
            <circle cx="110" cy="8" r="2.5" className="fill-cyan-50 dark:fill-cyan-950" />
          </g>
        </g>

        {/* Head */}
        <circle
          cx="110"
          cy="95"
          r="70"
          className="fill-violet-100 stroke-violet-300 dark:fill-violet-950 dark:stroke-violet-700"
          strokeWidth="2"
        />

        {/* Head shading -- clipped to the head circle so the shadow/highlight
            ellipses can never bleed past its edge regardless of size. Radial
            gradients (not a flat fill) so they fade to nothing instead of
            reading as a hard-edged gray/white oval sitting on the fill --
            colorless black/white overlays, so they darken/lighten whatever
            the head's own light/dark fill already is without needing a
            dark: pair of their own. */}
        <g clipPath={`url(#${headClipId})`}>
          <ellipse cx="110" cy="150" rx="50" ry="28" fill={`url(#${headShadowId})`} />
          <ellipse cx="85" cy="62" rx="24" ry="15" fill={`url(#${headHighlightId})`} />
        </g>

        {/* Eyebrows -- thicker stroke for more expressiveness; endpoints
            come from EYEBROW_ANGLE[pose] above. */}
        <line
          x1="70"
          y1={eyebrow.outerY}
          x2="95"
          y2={eyebrow.innerY}
          className="stroke-slate-700 transition-all duration-500 dark:stroke-slate-200"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="125"
          y1={eyebrow.innerY}
          x2="150"
          y2={eyebrow.outerY}
          className="stroke-slate-700 transition-all duration-500 dark:stroke-slate-200"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Eyes -- blink in idle/thinking, squint (static, no blink) in
            notFound. Each pupil gets a small shine dot; the dot's own color
            inverts with the pupil (bright-on-dark in light mode, same as a
            dark-on-light dimple in dark mode) so it stays a visible accent
            against whichever pupil color is active, not just literally
            white -- see the pupil's own light/dark inversion below. */}
        <g
          className={cn(
            "transition-transform duration-500",
            pose === "notFound" ? "scale-y-50" : "animate-mascot-blink"
          )}
          style={{ transformOrigin: "110px 92px" }}
        >
          <circle cx="85" cy="92" r="8" className="fill-slate-800 dark:fill-slate-100" />
          <circle cx="135" cy="92" r="8" className="fill-slate-800 dark:fill-slate-100" />
          <circle cx="83" cy="89" r="2.2" className="fill-white dark:fill-slate-700" />
          <circle cx="133" cy="89" r="2.2" className="fill-white dark:fill-slate-700" />
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

        {/* Attention: arm reaches for the card's edge (drawn here, as a
            dashed line -- there's no real border on QuizSearchHero's card
            container to align to instead) and taps twice, with a ripple
            pair and 4 short impact rays at the contact point. Always
            mounted, opacity-toggled like the sad-face group above -- every
            animation here keeps running underneath even while hidden,
            which is cheaper than gating each one's class on top of the
            group opacity. */}
        <g
          className={cn(
            "transition-opacity duration-500",
            pose === "attention" ? "opacity-100" : "opacity-0"
          )}
        >
          <line
            x1="218"
            y1="130"
            x2="218"
            y2="200"
            className="stroke-violet-300/40 dark:stroke-violet-700/40"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          <circle
            cx="212"
            cy="165"
            r="12"
            className="animate-mascot-ripple fill-none stroke-cyan-400 dark:stroke-cyan-300"
            strokeWidth="2"
          />
          <circle
            cx="212"
            cy="165"
            r="12"
            className="animate-mascot-ripple fill-none stroke-cyan-400 dark:stroke-cyan-300"
            strokeWidth="2"
            style={{ animationDelay: "0.48s" }}
          />

          <g className="animate-mascot-tap">
            <line
              x1="172"
              y1="185"
              x2="212"
              y2="165"
              className="stroke-violet-400 dark:stroke-violet-500"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* Hand: nested so only the palm/fingers squash on contact --
                the arm line above stays a straight, unsquashed line. */}
            <g className="animate-mascot-hand-squash" style={{ transformOrigin: "212px 165px" }}>
              <ellipse
                cx="212"
                cy="165"
                rx="11"
                ry="9"
                className="fill-violet-200 stroke-violet-400 dark:fill-violet-800 dark:stroke-violet-500"
                strokeWidth="2"
              />
              <ellipse cx="214" cy="167" rx="6" ry="4.5" className="fill-violet-500/20 dark:fill-black/25" />
              <line
                x1="219"
                y1="157"
                x2="225"
                y2="151"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="stroke-violet-400 dark:stroke-violet-500"
              />
              <line
                x1="221"
                y1="162"
                x2="228"
                y2="158"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="stroke-violet-400 dark:stroke-violet-500"
              />
              <line
                x1="221"
                y1="167"
                x2="228"
                y2="166"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="stroke-violet-400 dark:stroke-violet-500"
              />
              <line
                x1="219"
                y1="172"
                x2="225"
                y2="174"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="stroke-violet-400 dark:stroke-violet-500"
              />
            </g>
          </g>

          {/* Impact rays -- two instances, delayed to land on the tap's two
              contact beats (4% and 12% of the shared 6s cycle = 0.48s apart). */}
          <g className="animate-mascot-impact" style={{ transformOrigin: "212px 165px" }}>
            <line x1="212" y1="152" x2="212" y2="144" strokeWidth="2" strokeLinecap="round" className="stroke-cyan-400 dark:stroke-cyan-300" />
            <line x1="225" y1="165" x2="233" y2="165" strokeWidth="2" strokeLinecap="round" className="stroke-cyan-400 dark:stroke-cyan-300" />
            <line x1="221" y1="154" x2="227" y2="147" strokeWidth="2" strokeLinecap="round" className="stroke-cyan-400 dark:stroke-cyan-300" />
            <line x1="221" y1="176" x2="227" y2="183" strokeWidth="2" strokeLinecap="round" className="stroke-cyan-400 dark:stroke-cyan-300" />
          </g>
          <g className="animate-mascot-impact" style={{ transformOrigin: "212px 165px", animationDelay: "0.48s" }}>
            <line x1="212" y1="152" x2="212" y2="144" strokeWidth="2" strokeLinecap="round" className="stroke-cyan-400 dark:stroke-cyan-300" />
            <line x1="225" y1="165" x2="233" y2="165" strokeWidth="2" strokeLinecap="round" className="stroke-cyan-400 dark:stroke-cyan-300" />
            <line x1="221" y1="154" x2="227" y2="147" strokeWidth="2" strokeLinecap="round" className="stroke-cyan-400 dark:stroke-cyan-300" />
            <line x1="221" y1="176" x2="227" y2="183" strokeWidth="2" strokeLinecap="round" className="stroke-cyan-400 dark:stroke-cyan-300" />
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
