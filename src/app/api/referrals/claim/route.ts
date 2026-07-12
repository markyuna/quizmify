import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { grantPremiumDays, REFERRAL_REWARD_DAYS } from "@/lib/premium";

// Only a signup within this window of "now" counts as "fresh" -- an
// existing user revisiting an old referral link later shouldn't be able to
// backfill a reward for an account that already existed.
const FRESH_SIGNUP_WINDOW_MS = 10 * 60 * 1000;

const claimSchema = z.object({ referrerId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    // Distinguishable from "checked and not eligible" -- the client uses
    // this to know it should retry on a later, authenticated page load
    // instead of treating this as a resolved attempt.
    return NextResponse.json({ claimed: false, reason: "unauthenticated" }, { status: 200 });
  }

  const body = await req.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ claimed: false }, { status: 200 });
  }

  const { referrerId } = parsed.data;
  const userId = session.user.id;

  if (referrerId === userId) {
    return NextResponse.json({ claimed: false, reason: "self_referral" });
  }

  const [me, referrer] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, createdAt: true } }),
    prisma.user.findUnique({ where: { id: referrerId }, select: { id: true } }),
  ]);

  if (!me || !referrer) {
    return NextResponse.json({ claimed: false, reason: "not_found" });
  }

  if (Date.now() - me.createdAt.getTime() > FRESH_SIGNUP_WINDOW_MS) {
    return NextResponse.json({ claimed: false, reason: "not_fresh_signup" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // @@unique([referredId]) is the real guard against double-claiming --
      // this insert is the atomic "has this account already been referred"
      // check, not just a nice-to-have.
      await tx.referral.create({
        data: { referrerId, referredId: userId, rewardDays: REFERRAL_REWARD_DAYS },
      });
      await grantPremiumDays(tx, referrerId, REFERRAL_REWARD_DAYS);
      await grantPremiumDays(tx, userId, REFERRAL_REWARD_DAYS);
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ claimed: false, reason: "already_claimed" });
    }
    console.error("referral claim failed:", error);
    return NextResponse.json({ claimed: false, reason: "error" }, { status: 500 });
  }

  return NextResponse.json({ claimed: true, rewardDays: REFERRAL_REWARD_DAYS });
}
