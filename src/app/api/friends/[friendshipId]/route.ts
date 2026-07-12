import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

const actionSchema = z.object({ action: z.enum(["accept", "decline"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ friendshipId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendshipId } = await params;
  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only the recipient can accept/decline -- the sender doesn't get to
  // approve their own request. This is the actual "mutual consent" gate.
  if (friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (friendship.status !== "pending") {
    return NextResponse.json({ error: "Request already resolved" }, { status: 409 });
  }

  if (parsed.data.action === "accept") {
    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: "accepted", respondedAt: new Date() },
    });
    return NextResponse.json({ success: true, status: "accepted" });
  }

  await prisma.friendship.delete({ where: { id: friendshipId } });
  return NextResponse.json({ success: true, status: "declined" });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ friendshipId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendshipId } = await params;
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Either side can end a friendship or cancel a request they're part of.
  if (friendship.requesterId !== session.user.id && friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.friendship.delete({ where: { id: friendshipId } });
  return NextResponse.json({ success: true });
}
