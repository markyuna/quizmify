import { NextResponse } from "next/server";
import { z } from "zod";

import "@/lib/games/registerAll";
import { submitGuestAttempt, claimGuestAttempts, isGuestGameImplemented, type GuestGameKey } from "@/lib/guestPlay";
import { guestGameKeySchema, submitGuestAttemptSchema } from "@/schemas/form/guestGame";
import { getRequestLocale } from "@/i18n/get-locale";
import { getAuthSession } from "@/lib/nextauth";

export async function POST(req: Request, { params }: { params: Promise<{ gameKey: string }> }) {
  try {
    const { gameKey: rawGameKey } = await params;
    const parsedKey = guestGameKeySchema.safeParse(rawGameKey);

    if (!parsedKey.success) {
      return NextResponse.json({ error: "Unknown game" }, { status: 404 });
    }

    const gameKey = parsedKey.data as GuestGameKey;

    if (!isGuestGameImplemented(gameKey)) {
      return NextResponse.json({ error: "Not available yet" }, { status: 501 });
    }

    const body = await req.json();
    const { guestId, answer, challengeId } = submitGuestAttemptSchema.parse(body);

    const locale = await getRequestLocale();
    const session = await getAuthSession();
    const userId = session?.user?.id ?? null;
    const result = await submitGuestAttempt({ gameKey, language: locale, guestId, answer, challengeId, userId });

    // This exact account already completed this gameKey today via a
    // different guestId/session (see submitGuestAttempt's own comment) --
    // no fresh attempt was graded. Same generic "already played" shape a
    // guest gets; deliberately never the real past result here (confirmed
    // decision -- avoids a second guestId being usable to peek at today's
    // answer/result for an account that already played).
    if (result.alreadyPlayedByUser) {
      return NextResponse.json({
        success: true,
        attemptId: result.attemptId,
        alreadyPlayed: true,
        alreadyPlayedByUser: true,
        claimed: false,
      });
    }

    const { attempt, alreadyPlayed } = result;

    // If the browser is already signed in (e.g. they played this "guest"
    // round without realizing they're logged in, or on a device where
    // they already have an account), there's no conversion gate to clear
    // -- claim immediately and hand back the real result instead of
    // making them go through ConversionModal for nothing.
    if (userId) {
      const { xpAwarded } = await claimGuestAttempts(userId, guestId);
      return NextResponse.json({
        success: true,
        attemptId: attempt.id,
        alreadyPlayed,
        claimed: true,
        isCorrect: attempt.isCorrect,
        resultPayload: attempt.resultPayload,
        xpAwarded,
      });
    }

    // Deliberately never returns isCorrect/resultPayload/xpEarned for a
    // guest -- the whole point of this flow is that the result stays
    // hidden until they register (see ConversionModal / /api/guest/claim).
    // The attempt is graded and persisted now so it's ready the moment
    // they do.
    return NextResponse.json({ success: true, attemptId: attempt.id, alreadyPlayed, claimed: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.flatten() }, { status: 400 });
    }

    console.error("POST /api/guest/[gameKey]/submit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
