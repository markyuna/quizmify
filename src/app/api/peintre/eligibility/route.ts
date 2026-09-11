import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { getTodayDateKey } from "@/lib/guestPlay";
import { PEINTRE_COST_PER_GAME } from "@/lib/neurons/costs";
import { PEINTRE_GAME_KEY } from "@/lib/peintre/config";

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
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isPro = isEffectivelyPro(user);

  // True only for a Pro who hasn't yet completed their one free game today
  // (UserDailyFreeGame row is written on completion). Always false for free
  // users -- they never get the free slot.
  const freeGameAvailableToday =
    isPro &&
    (await prisma.userDailyFreeGame.findUnique({
      where: {
        userId_gameKey_date: {
          userId: session.user.id,
          gameKey: PEINTRE_GAME_KEY,
          date: getTodayDateKey(),
        },
      },
      select: { id: true },
    })) === null;

  return NextResponse.json(
    {
      isPro,
      neuronsBalance: user.neuronsBalance,
      cost: PEINTRE_COST_PER_GAME,
      freeGameAvailableToday,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
