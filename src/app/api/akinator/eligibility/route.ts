import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { getTodayDateKey } from "@/lib/guestPlay";
import { AKINATOR_COST_PER_GAME } from "@/lib/neurons/costs";
import { MAX_QUESTIONS } from "@/lib/akinator/config";

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
  // See the equivalent block in /api/morpion/eligibility.
  const freeGameAvailableToday =
    isPro &&
    (await prisma.userDailyFreeGame.findUnique({
      where: {
        userId_gameKey_date: {
          userId: session.user.id,
          gameKey: "akinator",
          date: getTodayDateKey(),
        },
      },
      select: { id: true },
    })) === null;

  return NextResponse.json(
    {
      isPro,
      neuronsBalance: user.neuronsBalance,
      cost: AKINATOR_COST_PER_GAME,
      freeGameAvailableToday,
      questionLimit: MAX_QUESTIONS,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
