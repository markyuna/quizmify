import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { PRESENCE_WRITE_THROTTLE_MS } from "@/lib/presence";

/**
 * Heartbeat endpoint for the friends presence indicator (src/lib/presence.ts).
 * Deliberately does nothing but write User.lastSeenAt -- getAuthSession()
 * only reads the session here, it never calls the NextAuth `update()` path,
 * so this route has no effect on token.lastActivity / the idle-timeout
 * countdown (see src/lib/nextauth.ts). Single conditional updateMany, no
 * prior read: the throttle window is enforced entirely by the WHERE clause,
 * so a tab pinging every minute does at most one write per
 * PRESENCE_WRITE_THROTTLE_MS regardless of how often it calls this.
 */
export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const throttleCutoff = new Date(now.getTime() - PRESENCE_WRITE_THROTTLE_MS);

  await prisma.user.updateMany({
    where: {
      id: session.user.id,
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: throttleCutoff } }],
    },
    data: { lastSeenAt: now },
  });

  // 204 regardless of whether the throttle let the write through -- the
  // client has no reason to distinguish "wrote" from "throttled".
  return new NextResponse(null, { status: 204 });
}
