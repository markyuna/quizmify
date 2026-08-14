import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/nextauth";
import { claimPersonalityTestAttempts } from "@/lib/personalityTests/attempts";
import { claimPersonalityTestAttemptsSchema } from "@/schemas/form/personalityTest";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    // Same "unauthenticated" contract GuestRoundClaim.tsx already polls on
    // for /api/guest/claim -- tells the client to retry on a later,
    // authenticated page load instead of giving up.
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", reason: "unauthenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { guestId } = claimPersonalityTestAttemptsSchema.parse(body);

    const { claimedCount, latestAttemptId } = await claimPersonalityTestAttempts(session.user.id, guestId);

    return NextResponse.json({ success: true, claimedCount, latestAttemptId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.flatten() }, { status: 400 });
    }

    console.error("POST /api/personality-tests/claim error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
