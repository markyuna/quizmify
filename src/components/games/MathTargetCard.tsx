"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, X, Plus, Minus, Divide } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGuestId, useGuestChallenge, useSubmitGuestAnswer } from "@/hooks/useGuestRound";
import ConversionModal from "./ConversionModal";

type MathOp = "+" | "-" | "*" | "/";
type MathStep = { a: number; b: number; op: MathOp; result: number };
type Tile = { id: number; value: number };

const OPS: readonly { op: MathOp; icon: React.ComponentType<{ className?: string }> }[] = [
  { op: "+", icon: Plus },
  { op: "-", icon: Minus },
  { op: "*", icon: X },
  { op: "/", icon: Divide },
];

// Client-side mirror of applyMathOp in src/lib/games/mathTarget.ts -- kept
// separate rather than imported, since that module pulls in guestPlay.ts
// -> src/lib/db.ts (Prisma/pg), which must never end up in a client bundle.
// The server never trusts this copy either way; it revalidates every step
// itself in grade().
function applyMathOp(a: number, b: number, op: MathOp): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a > b ? a - b : null;
    case "*":
      return a * b;
    case "/":
      return b !== 0 && a % b === 0 ? a / b : null;
  }
}

type RevealedResult = {
  isCorrect: boolean;
  target: number;
  reachedValue: number | null;
  xpAwarded: number;
};

type MathTargetCardProps = {
  isAuthenticated: boolean;
};

export default function MathTargetCard({ isAuthenticated }: MathTargetCardProps) {
  const t = useTranslations("GuestGames.mathTarget");
  const guestId = useGuestId();
  const { data: challengeData, isLoading: isChallengeLoading } = useGuestChallenge("math_target", guestId);

  const target = challengeData?.challenge.target as number | undefined;
  const operands = challengeData?.challenge.operands as number[] | undefined;
  const alreadyPlayed = challengeData?.attempted ?? false;

  const [tiles, setTiles] = React.useState<Tile[] | null>(null);
  const [steps, setSteps] = React.useState<MathStep[]>([]);
  const [armedId, setArmedId] = React.useState<number | null>(null);
  const [pendingOp, setPendingOp] = React.useState<MathOp | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [revealedResult, setRevealedResult] = React.useState<RevealedResult | null>(null);
  const nextIdRef = React.useRef(0);

  React.useEffect(() => {
    if (!operands || tiles !== null) return;
    nextIdRef.current = operands.length;
    setTiles(operands.map((value, id) => ({ id, value })));
  }, [operands, tiles]);

  const submitAnswer = useSubmitGuestAnswer();

  function handleTileClick(tile: Tile) {
    setError(null);

    if (armedId === null) {
      setArmedId(tile.id);
      return;
    }
    if (armedId === tile.id) {
      setArmedId(null);
      setPendingOp(null);
      return;
    }
    if (pendingOp === null) {
      setArmedId(tile.id);
      return;
    }

    const armedTile = tiles?.find((t2) => t2.id === armedId);
    if (!armedTile) return;

    const result = applyMathOp(armedTile.value, tile.value, pendingOp);
    if (result === null) {
      setError(t("invalidOperation"));
      setArmedId(null);
      setPendingOp(null);
      return;
    }

    const newTile: Tile = { id: nextIdRef.current++, value: result };
    setTiles((prev) => (prev ?? []).filter((t2) => t2.id !== armedId && t2.id !== tile.id).concat(newTile));
    setSteps((prev) => [...prev, { a: armedTile.value, b: tile.value, op: pendingOp, result }]);
    setArmedId(null);
    setPendingOp(null);
  }

  async function handleSubmitTile(tile: Tile) {
    if (!guestId || !challengeData) return;

    const result = await submitAnswer.mutateAsync({
      gameKey: "math_target",
      guestId,
      challengeId: challengeData.challengeId,
      answer: { steps, finalValue: tile.value },
    });

    if (result.claimed) {
      const payload = result.resultPayload as { target?: number; reachedValue?: number | null } | undefined;
      setRevealedResult({
        isCorrect: result.isCorrect ?? false,
        target: payload?.target ?? 0,
        reachedValue: payload?.reachedValue ?? null,
        xpAwarded: result.xpAwarded ?? 0,
      });
    } else {
      setShowModal(true);
    }
  }

  if (isChallengeLoading || !challengeData || !tiles) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (alreadyPlayed && !revealedResult) {
    return (
      <div className="rounded-2xl bg-slate-100 px-3 py-4 text-center text-sm text-slate-500 dark:bg-white/10 dark:text-slate-400">
        {isAuthenticated ? t("comeBackTomorrow") : t("alreadyPlayedGuest")}
        {!isAuthenticated && (
          <Button className="mt-3 w-full" size="sm" onClick={() => setShowModal(true)}>
            {t("seeResultCta")}
          </Button>
        )}
        <ConversionModal open={showModal} onOpenChange={setShowModal} />
      </div>
    );
  }

  if (revealedResult) {
    return (
      <div className="rounded-2xl bg-slate-100 px-3 py-4 text-center dark:bg-white/10">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {revealedResult.isCorrect
            ? t("youWon", { target: revealedResult.target })
            : t("youLost", { target: revealedResult.target, reached: revealedResult.reachedValue ?? "?" })}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("xpAwarded", { xp: revealedResult.xpAwarded })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-center text-2xl font-black text-slate-900 dark:text-white">{target}</p>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">{t("targetLabel")}</p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {tiles.map((tile) => (
          <div key={tile.id} className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => handleTileClick(tile)}
              disabled={submitAnswer.isPending}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition-colors",
                armedId === tile.id
                  ? "border-violet-500 bg-violet-500 text-white"
                  : "border-slate-200 bg-white text-slate-900 hover:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-white"
              )}
            >
              {tile.value}
            </button>
            <button
              type="button"
              onClick={() => handleSubmitTile(tile)}
              disabled={submitAnswer.isPending}
              className="text-[10px] font-medium text-violet-600 underline hover:text-violet-700 disabled:opacity-50 dark:text-violet-400"
            >
              {t("useThis")}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {OPS.map(({ op, icon: Icon }) => (
          <button
            key={op}
            type="button"
            onClick={() => setPendingOp(op)}
            disabled={armedId === null || submitAnswer.isPending}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold disabled:opacity-30",
              pendingOp === op
                ? "border-fuchsia-500 bg-fuchsia-500 text-white"
                : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      {error && <p className="mt-2 text-center text-xs font-medium text-red-500">{error}</p>}

      {submitAnswer.isPending && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("submitting")}
        </p>
      )}

      <ConversionModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
