import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { sendFriendRequest, getFriendsOverview } from "@/lib/friends";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overview = await getFriendsOverview(session.user.id);
  return NextResponse.json(overview);
}

const sendRequestSchema = z.object({
  targetUserId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = sendRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { targetUserId } = parsed.data;

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "Can't add yourself as a friend" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const outcome = await sendFriendRequest(session.user.id, targetUserId);
  // Stable codes, not copy (the existing callers show their generic error
  // toast on any 4xx). "blocked" is deliberately vague: it never says who
  // blocked whom.
  if (outcome === "blocked") {
    return NextResponse.json({ error: "FRIEND_REQUEST_NOT_ALLOWED" }, { status: 403 });
  }
  if (outcome === "rate_limited") {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  if (outcome === "too_many_pending") {
    return NextResponse.json({ error: "TOO_MANY_PENDING_REQUESTS" }, { status: 429 });
  }
  return NextResponse.json({ outcome });
}
