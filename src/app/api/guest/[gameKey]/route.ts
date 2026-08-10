import { NextResponse } from "next/server";

import "@/lib/games/registerAll";
import { getTodaysClientChallenge, isGuestGameImplemented, type GuestGameKey } from "@/lib/guestPlay";
import { guestGameKeySchema } from "@/schemas/form/guestGame";
import { getRequestLocale } from "@/i18n/get-locale";

export async function GET(req: Request, { params }: { params: Promise<{ gameKey: string }> }) {
  const { gameKey: rawGameKey } = await params;
  const parsedKey = guestGameKeySchema.safeParse(rawGameKey);

  if (!parsedKey.success) {
    return NextResponse.json({ error: "Unknown game" }, { status: 404 });
  }

  const gameKey = parsedKey.data as GuestGameKey;

  // Phase 1 ships the carousel + this plumbing before any game logic is
  // registered -- games 2-4 register themselves with registerGuestGame()
  // as each phase lands, and this stops being reachable for them.
  if (!isGuestGameImplemented(gameKey)) {
    return NextResponse.json({ error: "Not available yet" }, { status: 501 });
  }

  const guestId = new URL(req.url).searchParams.get("guestId");
  const locale = await getRequestLocale();
  const { challengeId, date, challenge, attempted } = await getTodaysClientChallenge(gameKey, locale, guestId);

  return NextResponse.json({ challengeId, date, challenge, attempted });
}
