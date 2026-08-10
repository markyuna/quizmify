import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { GuestGameKey } from "@/lib/guestPlay";
import { scoreGuess, normalizeWord, MAX_WORD_GUESSES } from "@/lib/games/wordOfDay";

const guessRequestSchema = z.object({
  challengeId: z.string().min(1),
  guess: z.string().min(1).max(16),
});

/**
 * Live per-guess scoring for a Mot du Jour round in progress. Deliberately
 * stateless: it doesn't persist anything or enforce the max-6-guesses cap
 * (that's a client-side UX limit -- see WordOfDayCard.tsx), because nothing
 * of consequence is at stake in over-calling it (no XP, no account, and the
 * daily one-attempt-per-guest guard lives on the real submit route, not
 * here). Its only job is to score a guess against the day's word without
 * ever putting that word on the wire until the guess matches it.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { challengeId, guess } = guessRequestSchema.parse(body);

    const challenge = await prisma.dailyGameChallenge.findUnique({ where: { id: challengeId } });

    if (!challenge || challenge.gameKey !== GuestGameKey.word_of_day) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const target = (challenge.payload as { word: string }).word;
    const normalizedTarget = normalizeWord(target);
    const normalizedGuess = normalizeWord(guess);

    if (normalizedGuess.length !== normalizedTarget.length) {
      return NextResponse.json(
        { error: `Guess must be ${normalizedTarget.length} letters` },
        { status: 400 }
      );
    }

    const feedback = scoreGuess(target, guess);
    const isWin = normalizedGuess === normalizedTarget;

    return NextResponse.json({ feedback, isWin, maxGuesses: MAX_WORD_GUESSES });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    console.error("POST /api/guest/word_of_day/guess error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
