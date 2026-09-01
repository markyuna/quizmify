import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
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

  return NextResponse.json(
    {
      isPro: isEffectivelyPro(user),
      neuronsBalance: user.neuronsBalance,
      cost: AKINATOR_COST_PER_GAME,
      questionLimit: MAX_QUESTIONS,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
