import * as React from "react";
import { Flame, Sparkles, Trophy } from "lucide-react";

export type ShareResultCardProps = {
  topic: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  currentStreak: number;
};

const CARD_WIDTH = 480;
const CARD_HEIGHT = 640;

/**
 * Pure presentational card captured by html2canvas in ShareResultButton --
 * fixed pixel dimensions (not responsive) since it's only ever rendered
 * off-screen to be rasterized, never shown directly in the page layout.
 */
const ShareResultCard = React.forwardRef<HTMLDivElement, ShareResultCardProps>(
  ({ topic, score, correctAnswers, totalQuestions, currentStreak }, ref) => {
    const scoreEmoji = score >= 80 ? "🏆" : score >= 50 ? "👍" : "💪";

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
          {/* Emoji glyphs render taller than a text line-height:1 box
              accounts for, especially under html2canvas's own font metrics
              -- the extra line-height here keeps that overflow from
              crowding the score line below it. */}
          <p className="text-7xl" style={{ lineHeight: 1.3 }}>
            {scoreEmoji}
          </p>
          <p className="mt-6 text-7xl font-black leading-none">{score}%</p>
          <p className="mt-5 text-lg font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
            {correctAnswers}/{totalQuestions} correct
          </p>
          <p
            className="mx-auto mt-4 font-semibold leading-snug"
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
            <span className="text-sm font-semibold">Quiz completed</span>
          </div>
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5">
              <Flame className="h-5 w-5" style={{ color: "#fcd34d" }} />
              <span className="text-sm font-bold">{currentStreak}-day streak</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ShareResultCard.displayName = "ShareResultCard";

export default ShareResultCard;
