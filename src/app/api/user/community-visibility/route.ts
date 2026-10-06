import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

// Toggle for User.showInCommunityFeed -- whether the homepage activity
// ticker may show this user's recent games (see getRecentCommunityActivity).
// Same GET/PATCH shape as /api/notifications/preferences.
const visibilitySchema = z.object({
  showInCommunityFeed: z.boolean(),
});

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { showInCommunityFeed: true },
  });

  return NextResponse.json({ showInCommunityFeed: user?.showInCommunityFeed ?? true });
}

export async function PATCH(req: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = visibilitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { showInCommunityFeed: parsed.data.showInCommunityFeed },
    select: { showInCommunityFeed: true },
  });

  return NextResponse.json(updated);
}
