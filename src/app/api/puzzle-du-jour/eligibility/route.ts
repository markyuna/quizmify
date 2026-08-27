import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { isEffectivelyPro } from "@/lib/paywall";
import { PUZZLE_DU_JOUR_DAILY_LIMIT, getTodayDateKey } from "@/lib/puzzleDuJour";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionStatus: true, premiumUntil: true, neuronsBalance: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPro = isEffectivelyPro(user);
  const playedToday = isPro
    ? await prisma.puzzleDuJourGame.count({
        where: { userId: session.user.id, date: getTodayDateKey() },
      })
    : 0;

  // Cheap regardless of Pro status -- simpler than special-casing it away
  // for Pro, and a lapsed-Pro user with a leftover ticket should still see
  // it correctly once they're back to non-Pro.
  const availableTicket = await prisma.neuronUnlock.findFirst({
    where: { userId: session.user.id, gameKey: "puzzleDuJour", status: "available" },
    select: { id: true },
  });

  return NextResponse.json(
    {
      isPro,
      remainingToday: Math.max(0, PUZZLE_DU_JOUR_DAILY_LIMIT - playedToday),
      neuronsBalance: user.neuronsBalance,
      hasAvailableTicket: !!availableTicket,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
