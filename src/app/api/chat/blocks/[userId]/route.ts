import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { blockUser, unblockUser } from "@/lib/chat";
import { chatError, idParamSchema } from "@/lib/chatApi";

type Params = { params: Promise<{ userId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) return chatError("UNAUTHORIZED", 401);

  const target = idParamSchema.safeParse((await params).userId);
  if (!target.success) return chatError("INVALID_INPUT", 400);
  if (target.data === session.user.id) return chatError("CANNOT_TARGET_SELF", 400);

  const exists = await prisma.user.findUnique({ where: { id: target.data }, select: { id: true } });
  if (!exists) return chatError("USER_NOT_FOUND", 404);

  await blockUser(session.user.id, target.data);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) return chatError("UNAUTHORIZED", 401);

  const target = idParamSchema.safeParse((await params).userId);
  if (!target.success) return chatError("INVALID_INPUT", 400);
  if (target.data === session.user.id) return chatError("CANNOT_TARGET_SELF", 400);

  await unblockUser(session.user.id, target.data);
  return NextResponse.json({ success: true });
}
