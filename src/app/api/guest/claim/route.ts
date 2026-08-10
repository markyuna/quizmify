import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/nextauth";
import { claimGuestAttempts } from "@/lib/guestPlay";
import { claimGuestAttemptsSchema } from "@/schemas/form/guestGame";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    // Matches the contract GuestRoundClaim.tsx polls on: this route gets
    // hit as soon as the page mounts, often before the account exists yet
    // (e.g. still on the registration form). "unauthenticated" tells the
    // client to leave its guest cookie alone and retry on a later,
    // authenticated page load instead of giving up.
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", reason: "unauthenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { guestId } = claimGuestAttemptsSchema.parse(body);

    const { claimedCount, xpAwarded } = await claimGuestAttempts(session.user.id, guestId);

    return NextResponse.json({ success: true, claimedCount, xpAwarded });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.flatten() }, { status: 400 });
    }

    console.error("POST /api/guest/claim error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
