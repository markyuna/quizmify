import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { grantPremiumDays, FREE_TRIAL_DAYS } from "@/lib/premium";

export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const premiumUntil = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { freeTrialUsedAt: true },
      });

      // One-time only, keyed off the user's own account -- freeTrialUsedAt
      // stays set forever once activated, regardless of whether premiumUntil
      // has since expired, so this can't be re-triggered by e.g. re-hitting
      // the paywall after the trial ends.
      if (user.freeTrialUsedAt) {
        throw new Error("TRIAL_ALREADY_USED");
      }

      await tx.user.update({ where: { id: userId }, data: { freeTrialUsedAt: new Date() } });
      return grantPremiumDays(tx, userId, FREE_TRIAL_DAYS);
    });

    return NextResponse.json({ success: true, premiumUntil });
  } catch (error) {
    if (error instanceof Error && error.message === "TRIAL_ALREADY_USED") {
      return NextResponse.json({ error: "Trial already used" }, { status: 409 });
    }
    console.error("trial activation failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
