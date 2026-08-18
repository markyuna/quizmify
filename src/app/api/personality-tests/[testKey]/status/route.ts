import { NextResponse } from "next/server";

import { isPersonalityTestKey } from "@/lib/personalityTests/attempts";
import { personalityTestKeySchema } from "@/schemas/form/personalityTest";
import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Whether the current session already has a permanent personality-test
 * result -- drives the "ya tenés tu mascota" gate in PersonalityTestCard.
 * A guest is trivially false (no User row to check); no 401 for that case
 * so the client doesn't have to special-case an error response just to mean
 * "not logged in, so no."
 */
export async function GET(_req: Request, { params }: { params: Promise<{ testKey: string }> }) {
  const { testKey: rawTestKey } = await params;
  const parsedKey = personalityTestKeySchema.safeParse(rawTestKey);

  if (!parsedKey.success || !isPersonalityTestKey(parsedKey.data)) {
    return NextResponse.json({ error: "Unknown test" }, { status: 404 });
  }

  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ hasAnimal: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { personalityAnimal: true },
  });

  return NextResponse.json({ hasAnimal: !!user?.personalityAnimal }, { headers: { "Cache-Control": "no-store" } });
}
