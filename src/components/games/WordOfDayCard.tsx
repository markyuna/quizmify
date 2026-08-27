"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, CornerDownLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGuestId, useGuestChallenge, useSubmitGuestAnswer } from "@/hooks/useGuestRound";
import { usePersonalityAnimalStatus } from "@/hooks/usePersonalityTest";
import ConversionModal from "./ConversionModal";
import MascotDiscoveryNudge from "./MascotDiscoveryNudge";

export type LetterStatus = "correct" | "present" | "absent";
type GuessRow = { word: string; feedback: LetterStatus[] };

// Exported so WordOfDayGuide.tsx's color legend/example tiles render with
// the exact same colors as a real guess row, instead of a second hardcoded
// copy that could drift out of sync.
export const TILE_CLASSES: Record<LetterStatus, string> = {
  correct: "bg-emerald-500 border-emerald-500 text-white",
  present: "bg-amber-400 border-amber-400 text-white",
  absent: "bg-slate-300 border-slate-300 text-white dark:bg-slate-600 dark:border-slate-600",
};

type WordOfDayCardProps = {
  isAuthenticated: boolean;
};

export default function WordOfDayCard({ isAuthenticated }: WordOfDayCardProps) {
  const t = useTranslations("GuestGames.wordOfDay");
  const guestId = useGuestId();
  const { data: challengeData, isLoading: isChallengeLoading } = useGuestChallenge("word_of_day", guestId);

  const [guesses, setGuesses] = React.useState<GuessRow[]>([]);
  const [currentInput, setCurrentInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [revealedResult, setRevealedResult] = React.useState<{
    isCorrect: boolean;
    word: string;
    xpAwarded: number;
  } | null>(null);
  // Set when a submit comes back alreadyPlayedByUser -- this account
  // already completed today's round under a different guestId/session,
  // discovered only at submit time (challengeData.attempted was stale).
  // Forces the same already-played state challengeData.attempted drives.
  const [forcedAlreadyPlayed, setForcedAlreadyPlayed] = React.useState(false);

  const submitAnswer = useSubmitGuestAnswer();
  const animalStatus = usePersonalityAnimalStatus(isAuthenticated);

  const wordLength = challengeData?.challenge.wordLength as number | undefined;
  const maxGuesses = (challengeData?.challenge.maxGuesses as number | undefined) ?? 6;
  const alreadyPlayed = (challengeData?.attempted ?? false) || forcedAlreadyPlayed;

  const [isGuessing, setIsGuessing] = React.useState(false);
  const roundOver = revealedResult !== null || guesses.some((g) => g.feedback.every((s) => s === "correct"));
  const outOfGuesses = guesses.length >= maxGuesses;

  async function finishRound(finalGuesses: GuessRow[]) {
    if (!guestId || !challengeData) return;

    const result = await submitAnswer.mutateAsync({
      gameKey: "word_of_day",
      guestId,
      challengeId: challengeData.challengeId,
      answer: { guesses: finalGuesses.map((g) => g.word) },
    });

    if (result.alreadyPlayedByUser) {
      setForcedAlreadyPlayed(true);
    } else if (result.claimed) {
      const payload = result.resultPayload as { word?: string } | undefined;
      setRevealedResult({
        isCorrect: result.isCorrect ?? false,
        word: payload?.word ?? "",
        xpAwarded: result.xpAwarded ?? 0,
      });
    } else {
      setShowModal(true);
    }
  }

  async function handleGuess() {
    setError(null);
    if (!challengeData || !wordLength) return;

    const guess = currentInput.trim();
    if ([...guess].length !== wordLength) {
      setError(t("wrongLength", { length: wordLength }));
      return;
    }

    setIsGuessing(true);
    try {
      const res = await fetch("/api/guest/word_of_day/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challengeData.challengeId, guess }),
      });

      if (!res.ok) {
        setError(t("genericError"));
        return;
      }

      const { feedback, isWin } = (await res.json()) as { feedback: LetterStatus[]; isWin: boolean };
      const nextGuesses = [...guesses, { word: guess, feedback }];
      setGuesses(nextGuesses);
      setCurrentInput("");

      if (isWin || nextGuesses.length >= maxGuesses) {
        await finishRound(nextGuesses);
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setIsGuessing(false);
    }
  }

  if (isChallengeLoading || !challengeData) {
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
          {revealedResult.isCorrect ? t("youWon") : t("youLost", { word: revealedResult.word })}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("xpAwarded", { xp: revealedResult.xpAwarded })}
        </p>
        <MascotDiscoveryNudge
          isAuthenticated={isAuthenticated}
          hasMascot={!!animalStatus.data?.hasAnimal}
          lastDismissedAt={animalStatus.data?.lastMascotNudgeDismissedAt ?? null}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-1.5">
        {guesses.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1.5">
            {row.feedback.map((status, letterIndex) => (
              <div
                key={letterIndex}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold uppercase",
                  TILE_CLASSES[status]
                )}
              >
                {[...row.word][letterIndex]}
              </div>
            ))}
          </div>
        ))}
      </div>

      {!roundOver && !outOfGuesses && (
        <div className="mt-3 flex gap-2">
          <Input
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value.replace(/[^A-Za-zÀ-ÿ]/g, "").toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGuess();
            }}
            maxLength={wordLength}
            disabled={isGuessing}
            placeholder={t("inputPlaceholder", { length: wordLength ?? 0 })}
            className="text-center uppercase tracking-widest"
          />
          <Button onClick={handleGuess} disabled={isGuessing || currentInput.length === 0} size="icon">
            {isGuessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}

      {submitAnswer.isPending ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("submitting")}
        </p>
      ) : (
        !roundOver && (
          <p className="mt-2 text-xs text-slate-400">
            {t("guessesLeft", { count: Math.max(0, maxGuesses - guesses.length) })}
          </p>
        )
      )}

      <ConversionModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
