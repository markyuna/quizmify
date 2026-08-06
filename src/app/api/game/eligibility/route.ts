import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { isUserAtFreeLimit, isUserPro } from "@/lib/paywall";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [atLimit, isPro] = await Promise.all([
    isUserAtFreeLimit(session.user.id),
    isUserPro(session.user.id),
  ]);

  return NextResponse.json(
    { eligible: !atLimit, isPro },
    { headers: { "Cache-Control": "no-store" } }
  );
}
