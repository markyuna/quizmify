"use client";

import * as React from "react";
import axios from "axios";
import { useTranslations } from "next-intl";
import { Sparkles, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { buildPuzzlePieces, shufflePieceOrder, type PuzzlePiece } from "@/lib/puzzleDuJourPieces";

type Difficulty = "easy" | "medium" | "hard";
type GameStatus = "in_progress" | "completed";

type PuzzleDuJourBoardProps = {
  gameId: string;
  topic: string;
  difficulty: Difficulty;
  gridCols: number;
  gridRows: number;
  imageUrl: string;
  initialStatus: GameStatus;
  xpEarned: number;
};

// Background-position/size sprite crop shared by every rendering of a
// piece -- the carousel tile and its placed grid cell use the exact same
// visual, just at different element sizes (the percentages are relative
// to whatever element they're applied to). Same technique PuzzleReveal.tsx
// already uses for Puzzle Mode's reveal grid.
function PieceVisual({ piece, imageUrl }: { piece: PuzzlePiece; imageUrl: string }) {
  return (
    <div
      className="h-full w-full"
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: `${piece.backgroundSizePercent.width}% ${piece.backgroundSizePercent.height}%`,
        backgroundPosition: `${piece.backgroundPositionPercent.x}% ${piece.backgroundPositionPercent.y}%`,
      }}
    />
  );
}

export default function PuzzleDuJourBoard({
  gameId,
  topic,
  difficulty,
  gridCols,
  gridRows,
  imageUrl,
  initialStatus,
  xpEarned,
}: PuzzleDuJourBoardProps) {
  const t = useTranslations("PuzzleDuJour");

  const pieces = React.useMemo(() => buildPuzzlePieces(gridCols, gridRows), [gridCols, gridRows]);
  const pieceById = React.useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces]);
  const totalPieces = pieces.length;

  const [carouselOrder] = React.useState(() => shufflePieceOrder(totalPieces));
  const [placedIds, setPlacedIds] = React.useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [completedResult, setCompletedResult] = React.useState<{ xpEarned: number } | null>(
    initialStatus === "completed" ? { xpEarned } : null
  );
  const [completing, setCompleting] = React.useState(false);

  const remainingCarousel = carouselOrder.filter((id) => !placedIds.has(id));

  function attemptPlace(pieceId: number, slotIndex: number) {
    if (completedResult) return;
    if (pieceId !== slotIndex) return; // wrong spot -- no-op, piece stays in the carousel
    setPlacedIds((prev) => {
      const next = new Set(prev);
      next.add(pieceId);
      return next;
    });
    setSelectedId(null);
  }

  React.useEffect(() => {
    if (completedResult || placedIds.size !== totalPieces || totalPieces === 0) return;

    let cancelled = false;
    setCompleting(true);
    axios
      .post<{ xpEarned: number }>(`/api/puzzle-du-jour/${gameId}/complete`)
      .then((res) => {
        if (!cancelled) setCompletedResult({ xpEarned: res.data.xpEarned });
      })
      .finally(() => {
        if (!cancelled) setCompleting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [placedIds, totalPieces, completedResult, gameId]);

  // Already solved before this page load -- read-only, never replayable.
  // A plain background-image div, not <img>/next/image, matching
  // PuzzleReveal.tsx's own convention for puzzle imagery elsewhere in the
  // app rather than introducing a second way to render the same thing.
  if (initialStatus === "completed") {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">{topic}</h1>
        <div
          className="mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl"
          style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Check className="h-4 w-4" />
          {t("alreadyCompletedMessage", { xp: xpEarned })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">{topic}</h1>
        <p className="text-xs text-slate-400">{t(`difficulty.${difficulty}`)}</p>
      </div>

      {/* Frame: full image as a low-opacity guide, grid cells on top */}
      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <div
          className="absolute inset-0 opacity-15"
          style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div
          className="relative grid h-full w-full"
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gridTemplateRows: `repeat(${gridRows}, 1fr)` }}
        >
          {/*
            Single tree with BOTH drag (desktop) and tap (mobile) handlers on
            the same node, instead of the hidden/sm:hidden dual-tree pattern
            used elsewhere (e.g. QuestionsList.tsx). Deliberate exception:
            "hard" difficulty is a 10x10 grid, so a duplicated tree here
            means ~200 cells + ~200 carousel tiles, each painting its own
            background-image slice -- double the DOM for no real benefit,
            since native HTML5 drag-and-drop doesn't fire from touch input
            on most mobile browsers, so draggable + onClick coexist on one
            node without conflicting. Don't "fix" this back to hidden/
            sm:hidden without re-reading this comment.
          */}
          {Array.from({ length: totalPieces }, (_, slotIndex) => {
            const piece = pieceById.get(slotIndex)!;
            const isPlaced = placedIds.has(slotIndex);
            return (
              <div
                key={slotIndex}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  attemptPlace(Number(e.dataTransfer.getData("text/plain")), slotIndex);
                }}
                onClick={() => selectedId !== null && attemptPlace(selectedId, slotIndex)}
                className={cn(
                  "border border-white/20",
                  selectedId !== null && !isPlaced && "cursor-pointer"
                )}
              >
                {isPlaced && <PieceVisual piece={piece} imageUrl={imageUrl} />}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
        {t("piecesPlaced", { placed: placedIds.size, total: totalPieces })}
      </p>
      <p className="text-center text-xs text-slate-400">
        <span className="hidden sm:inline">{t("dragPieceHint")}</span>
        <span className="sm:hidden">{t("selectPieceHint")}</span>
      </p>

      {/* Carousel of unplaced pieces -- same single-tree rationale as the
          grid cells above: draggable + onClick coexist on one tile. */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {remainingCarousel.map((pieceId) => {
          const piece = pieceById.get(pieceId)!;
          return (
            <div
              key={pieceId}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", String(pieceId))}
              onClick={() => setSelectedId((cur) => (cur === pieceId ? null : pieceId))}
              className={cn(
                "h-16 w-16 shrink-0 cursor-grab overflow-hidden rounded-lg shadow ring-1 sm:h-20 sm:w-20",
                selectedId === pieceId ? "ring-2 ring-emerald-500" : "ring-black/10"
              )}
            >
              <PieceVisual piece={piece} imageUrl={imageUrl} />
            </div>
          );
        })}
      </div>

      {completing && <p className="text-center text-xs text-slate-400">{t("generating")}</p>}

      {completedResult && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 p-4 text-center">
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Sparkles className="h-4 w-4 text-amber-500" />
            {t("completedTitle")}
          </p>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-300">
            {t("completedXp", { xp: completedResult.xpEarned })}
          </p>
        </div>
      )}
    </div>
  );
}
