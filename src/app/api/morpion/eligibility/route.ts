import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { getTodayDateKey } from "@/lib/guestPlay";
import { computeDifficulty } from "@/lib/morpion/ai";
import { MORPION_COST_PER_GAME } from "@/lib/neurons/costs";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionStatus: true,
        premiumUntil: true,
        neuronsBalance: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPro = isEffectivelyPro(user);

    // True only for a Pro who hasn't yet completed their one free Morpion
    // game today (UserDailyFreeGame row is written on completion). Always
    // false for free users -- they never get the free slot.
    const freeGameAvailableToday =
      isPro &&
      (await prisma.userDailyFreeGame.findUnique({
        where: {
          userId_gameKey_date: {
            userId: session.user.id,
            gameKey: "morpion",
            date: getTodayDateKey(),
          },
        },
        select: { id: true },
      })) === null;

    const recentGames = await prisma.morpionGame.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["won", "lost", "draw"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { status: true },
    });

    const difficulty = computeDifficulty(recentGames);

    return NextResponse.json(
      {
        isPro,
        neuronsBalance: user.neuronsBalance,
        difficulty,
        cost: MORPION_COST_PER_GAME,
        freeGameAvailableToday,
        recentWinRatio:
          recentGames.length > 0
            ? recentGames.filter((g) => g.status === "won").length / recentGames.length
            : 0,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Eligibility error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
