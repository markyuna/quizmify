"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Flame, Sparkles, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";

export type ShareResultCardProps = {
  topic: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  currentStreak: number;
  // Only set when Puzzle Mode was played AND every question was answered
  // correctly (the puzzle image is fully revealed) -- see the completeness
  // check at the call site in MCQ.tsx. Anything else (no puzzle, or an
  // incomplete one) passes null and the card renders exactly as before.
  puzzleImageUrl?: string | null;
};

const CARD_WIDTH = 480;
const CARD_HEIGHT = 640;

/**
 * Pure presentational card captured by html2canvas in ShareResultButton --
 * fixed pixel dimensions (not responsive) since it's only ever rendered
 * off-screen to be rasterized, never shown directly in the page layout.
 */
const ShareResultCard = React.forwardRef<HTMLDivElement, ShareResultCardProps>(
  ({ topic, score, correctAnswers, totalQuestions, currentStreak, puzzleImageUrl }, ref) => {
    const t = useTranslations("ShareResult");
    const scoreEmoji = score >= 80 ? "🏆" : score >= 50 ? "👍" : "💪";
    const hasPuzzleImage = Boolean(puzzleImageUrl);

    // Topic is free text (up to 200 chars) -- shrink it for long names so it
    // wraps within 2 lines instead of relying on text-overflow: ellipsis,
    // which html2canvas doesn't reliably honor (it can render the full,
    // untruncated string and blow past the card's fixed height).
    const topicFontSize = topic.length > 40 ? 15 : topic.length > 24 ? 17 : 20;

    return (
      // Colors here are inline hex/rgba, not Tailwind color utilities: this
      // card is rasterized off-screen by html2canvas, which can't parse the
      // oklch() color functions Tailwind v4's default palette emits, and
      // would throw on every capture ("share image" and "share" alike).
      <div
        ref={ref}
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          background: "linear-gradient(to bottom right, #7c3aed, #c026d3, #06b6d4)",
          color: "#ffffff",
        }}
        className="flex flex-col justify-between overflow-hidden p-10"
      >
        <div
          style={{ color: "rgba(255,255,255,0.8)" }}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.3em]"
        >
          <Sparkles className="h-4 w-4" />
          Quizmify
        </div>

        <div className="text-center">
          {hasPuzzleImage ? (
            // Puzzle-complete layout: a large image block replaces the
            // trophy emoji (fixed height, ~1/3 of the card, cropped to fit
            // via object-fit rather than sized to the square DALL-E output),
            // and everything below it uses tighter vertical spacing than
            // the default layout so the card still fits 480x640 without
            // overflow -- font sizes are untouched, only the gaps shrank.
            <div
              style={{
                width: "100%",
                height: 210,
                borderRadius: 24,
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- rasterized by html2canvas, not rendered by Next's image pipeline */}
              <img
                src={puzzleImageUrl ?? undefined}
                alt=""
                crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          ) : (
            // Emoji glyphs render taller than a text line-height:1 box
            // accounts for, especially under html2canvas's own font metrics
            // -- the extra line-height here keeps that overflow from
            // crowding the score line below it.
            <p className="text-7xl" style={{ lineHeight: 1.3 }}>
              {scoreEmoji}
            </p>
          )}
          <p className={cn("text-7xl font-black leading-none", hasPuzzleImage ? "mt-4" : "mt-6")}>
            {score}%
          </p>
          <p
            className={cn("text-lg font-semibold", hasPuzzleImage ? "mt-2" : "mt-5")}
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            {t("scoreCorrect", { correct: correctAnswers, total: totalQuestions })}
          </p>
          <p
            className={cn("mx-auto font-semibold leading-snug", hasPuzzleImage ? "mt-2" : "mt-4")}
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: topicFontSize,
              maxWidth: 380,
              wordBreak: "break-word",
            }}
          >
            {topic}
          </p>
        </div>

        <div
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          className="flex items-center justify-between rounded-2xl px-5 py-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: "#fcd34d" }} />
            <span className="text-sm font-semibold">{t("quizCompleted")}</span>
          </div>
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5">
              <Flame className="h-5 w-5" style={{ color: "#fcd34d" }} />
              <span className="text-sm font-bold">{t("streakDays", { days: currentStreak })}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ShareResultCard.displayName = "ShareResultCard";

export default ShareResultCard;
