import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createPersonalityTestAttempt,
  isPersonalityTestKey,
  PersonalityAnimalAlreadyAssignedError,
  type PersonalityTestKey,
} from "@/lib/personalityTests/attempts";
import { InvalidPersonalityTestAnswersError } from "@/lib/personalityTests/scoring";
import { getRecommendedCategorySlugs } from "@/lib/personalityTests/recommendations";
import type { CategorySlug } from "@/lib/personalityTests/quelAnimalEsTu.config";
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

    // The result (animal + recommendations) is shown to guest and logged-in
    // callers alike -- neither branch fixes anything on User yet, that only
    // happens on explicit confirmation (see /confirm and /claim). `claimed`
    // just tells the client which confirm path applies: already-claimed
    // (logged-in) calls /confirm directly, unclaimed (guest) opens the
    // registration flow and lets the existing guest -> account claim fix it.
    const session = await getAuthSession();
    const attempt = await createPersonalityTestAttempt({
      testKey,
      guestId,
      answers,
      userId: session?.user?.id,
    });

    const recommendations = await getRecommendedCategorySlugs(
      attempt.categoryScores as Partial<Record<CategorySlug, number>>
    );

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      claimed: !!session?.user?.id,
      resultKey: attempt.resultKey,
      scores: attempt.scores,
      recommendations,
    });
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
