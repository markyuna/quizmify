import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createPersonalityTestAttempt,
  createOfficialPersonalityTestAttemptForUser,
  isPersonalityTestKey,
  PersonalityAnimalAlreadyAssignedError,
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

    // Already signed in: this is specifically a first-time test for this
    // account, not a guest result to migrate, so it's written directly as
    // official rather than going through the unclaimed-row + claim
    // mechanism below (that mechanism is guest -> account only).
    const session = await getAuthSession();
    if (session?.user?.id) {
      const attempt = await createOfficialPersonalityTestAttemptForUser({
        testKey,
        userId: session.user.id,
        guestId,
        answers,
      });
      return NextResponse.json({
        success: true,
        attemptId: attempt.id,
        claimed: true,
        resultKey: attempt.resultKey,
        scores: attempt.scores,
      });
    }

    // Deliberately never returns resultKey/scores for a guest -- withheld
    // until they register, same as the 3 daily games. Stays unclaimed until
    // /api/personality-tests/claim picks a winner at account-claim time.
    const attempt = await createPersonalityTestAttempt({ testKey, guestId, answers });
    return NextResponse.json({ success: true, attemptId: attempt.id, claimed: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof InvalidPersonalityTestAnswersError) {
      return NextResponse.json({ error: "Invalid answers", details: error.message }, { status: 400 });
    }
    if (error instanceof PersonalityAnimalAlreadyAssignedError) {
      return NextResponse.json({ error: "personality_animal_already_assigned" }, { status: 409 });
    }

    console.error("POST /api/personality-tests/[testKey]/submit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
