import { Lock } from "lucide-react";

import { getPuzzleGridDimensions } from "@/lib/puzzleGrid";
import { cn } from "@/lib/utils";

type PuzzleRevealProps = {
  imageUrl: string;
  totalPieces: number;
  revealedIndices: Set<number>;
  title: string;
  progressLabel: string;
};

// Reveals a DALL-E generated image piece by piece as questions are answered
// correctly, using a CSS background-position sprite trick per cell instead
// of pre-slicing the image server-side -- one <img> worth of data, N grid
// cells, each showing (and blurring/unblurring) its own slice.
export default function PuzzleReveal({
  imageUrl,
  totalPieces,
  revealedIndices,
  title,
  progressLabel,
}: PuzzleRevealProps) {
  const { rows, cols } = getPuzzleGridDimensions(totalPieces);

  return (
    <div className="mb-4 rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">
          {title}
        </p>
        <p className="text-xs font-medium text-slate-400">{progressLabel}</p>
      </div>

      <div
        className="grid aspect-square w-full overflow-hidden rounded-2xl"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: totalPieces }).map((_, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const isRevealed = revealedIndices.has(index);
          const bgPosX = cols > 1 ? (col / (cols - 1)) * 100 : 0;
          const bgPosY = rows > 1 ? (row / (rows - 1)) * 100 : 0;

          return (
            <div
              key={index}
              className="relative"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: `${cols * 100}% ${rows * 100}%`,
                backgroundPosition: `${bgPosX}% ${bgPosY}%`,
              }}
            >
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-slate-900/85 backdrop-blur-sm transition-opacity duration-700",
                  isRevealed ? "pointer-events-none opacity-0" : "opacity-100"
                )}
              >
                <Lock className="h-4 w-4 text-white/40" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
