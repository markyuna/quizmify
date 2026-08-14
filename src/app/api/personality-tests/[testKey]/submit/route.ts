import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createPersonalityTestAttempt,
  claimPersonalityTestAttempts,
  isPersonalityTestKey,
  type PersonalityTestKey,
} from "@/lib/personalityTests/attempts";
import { InvalidPersonalityTestAnswersError } from "@/lib/personalityTests/scoring";
import { personalityTestKeySchema, submitPersonalityTestSchema } from "@/schemas/form/personalityTest";
import { getAuthSession } from "@/lib/nextauth";

export async function POST(req: Request, { params }: { params: Promise<{ testKey: string }> }) {
  try {
    const { testKey: rawTestKey } = await params;
    const parsedKey = personalityTestKeySchema.safeParse(rawTestKey);

    if (!parsedKey.success || !isPersonalityTestKey(parsedKey.data)) {
      return NextResponse.json({ error: "Unknown test" }, { status: 404 });
    }

    const testKey = parsedKey.data as PersonalityTestKey;

    const body = await req.json();
    const { guestId, answers } = submitPersonalityTestSchema.parse(body);

    const attempt = await createPersonalityTestAttempt({ testKey, guestId, answers });

    // Same "already signed in, no conversion gate to clear" shortcut as
    // /api/guest/[gameKey]/submit.
    const session = await getAuthSession();
    if (session?.user?.id) {
      await claimPersonalityTestAttempts(session.user.id, guestId);
      return NextResponse.json({
        success: true,
        attemptId: attempt.id,
        claimed: true,
        resultKey: attempt.resultKey,
        scores: attempt.scores,
      });
    }

    // Deliberately never returns resultKey/scores for a guest -- withheld
    // until they register, same as the 3 daily games.
    return NextResponse.json({ success: true, attemptId: attempt.id, claimed: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof InvalidPersonalityTestAnswersError) {
      return NextResponse.json({ error: "Invalid answers", details: error.message }, { status: 400 });
    }

    console.error("POST /api/personality-tests/[testKey]/submit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
