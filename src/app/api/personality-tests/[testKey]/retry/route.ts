import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deletePersonalityTestAttempt,
  isPersonalityTestKey,
  PersonalityTestAttemptNotDeletableError,
} from "@/lib/personalityTests/attempts";
import { personalityTestKeySchema, retryPersonalityTestAttemptSchema } from "@/schemas/form/personalityTest";
import { getAuthSession } from "@/lib/nextauth";

/**
 * Discards a result the caller actively rejected -- the "Reintentar" action
 * in the result modal. Deletes exactly the one attempt row named by
 * attemptId (never a broader deleteMany), and only if it's still eligible
 * to be discarded -- see deletePersonalityTestAttempt for the exact
 * ownership + not-official(+not-claimed for guests) conditions.
 */
export async function POST(req: Request, { params }: { params: Promise<{ testKey: string }> }) {
  try {
    const { testKey: rawTestKey } = await params;
    const parsedKey = personalityTestKeySchema.safeParse(rawTestKey);

    if (!parsedKey.success || !isPersonalityTestKey(parsedKey.data)) {
      return NextResponse.json({ error: "Unknown test" }, { status: 404 });
    }

    const body = await req.json();
    const { attemptId, guestId } = retryPersonalityTestAttemptSchema.parse(body);

    const session = await getAuthSession();

    await deletePersonalityTestAttempt({
      attemptId,
      userId: session?.user?.id,
      guestId: session?.user?.id ? undefined : guestId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof PersonalityTestAttemptNotDeletableError) {
      return NextResponse.json({ error: "attempt_not_deletable" }, { status: 409 });
    }

    console.error("POST /api/personality-tests/[testKey]/retry error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
