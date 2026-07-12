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
  return NextResponse.json({ outcome });
}
