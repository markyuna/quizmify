import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

/** Logged-in only -- guests persist their dismiss in localStorage instead
 * (see MascotDiscoveryNudge.tsx), there's no User row to write to. */
export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastMascotNudgeDismissedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
