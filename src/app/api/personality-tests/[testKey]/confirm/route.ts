import { NextResponse } from "next/server";
import { z } from "zod";

import {
  confirmPersonalityTestAttempt,
  isPersonalityTestKey,
  PersonalityAnimalAlreadyAssignedError,
  PersonalityTestAttemptNotFoundError,
} from "@/lib/personalityTests/attempts";
import { confirmPersonalityTestAttemptSchema, personalityTestKeySchema } from "@/schemas/form/personalityTest";
import { getAuthSession } from "@/lib/nextauth";

/**
 * Fixes the caller's own attempt as their permanent personality-test
 * result -- the "Confirmar" action in the result modal, logged-in only.
 * There is no guest branch: a guest confirming just opens the registration
 * flow client-side (ConversionModal), and the existing guest -> account
 * claim (see /api/personality-tests/claim) is what actually fixes the
 * animal once they sign up -- nothing to write here before an account
 * exists.
 */
export async function POST(req: Request, { params }: { params: Promise<{ testKey: string }> }) {
  try {
    const { testKey: rawTestKey } = await params;
    const parsedKey = personalityTestKeySchema.safeParse(rawTestKey);

    if (!parsedKey.success || !isPersonalityTestKey(parsedKey.data)) {
      return NextResponse.json({ error: "Unknown test" }, { status: 404 });
    }

    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", reason: "unauthenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { attemptId } = confirmPersonalityTestAttemptSchema.parse(body);

    const attempt = await confirmPersonalityTestAttempt(session.user.id, attemptId);

    return NextResponse.json({ success: true, resultKey: attempt.resultKey });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof PersonalityTestAttemptNotFoundError) {
      return NextResponse.json({ error: "attempt_not_found" }, { status: 404 });
    }
    if (error instanceof PersonalityAnimalAlreadyAssignedError) {
      return NextResponse.json({ error: "personality_animal_already_assigned" }, { status: 409 });
    }

    console.error("POST /api/personality-tests/[testKey]/confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
