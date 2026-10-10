import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

// Toggle for User.chatDiscoverable -- whether this user shows up in the
// chat panel's "other players" list (listChatContacts in src/lib/chat.ts).
// An opt-out for non-friends only: friends keep seeing them and the chat
// itself is unaffected. Same GET/PATCH shape as /api/user/community-visibility.
// Only reads the session (getAuthSession), never updates it, so calling it
// doesn't count as idle-timeout activity.
const discoverableSchema = z.object({
  discoverable: z.boolean(),
});

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { chatDiscoverable: true },
  });

  return NextResponse.json({ discoverable: user?.chatDiscoverable ?? true });
}

export async function PATCH(req: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Malformed JSON is a bad request, not a 500.
  const body = await req.json().catch(() => null);
  const parsed = discoverableSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { chatDiscoverable: parsed.data.discoverable },
    select: { chatDiscoverable: true },
  });

  return NextResponse.json({ discoverable: updated.chatDiscoverable });
}
