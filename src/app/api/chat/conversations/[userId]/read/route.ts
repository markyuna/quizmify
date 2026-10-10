import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { canChat, markConversationRead } from "@/lib/chat";
import { chatAccessError, chatError, idParamSchema } from "@/lib/chatApi";

export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) return chatError("UNAUTHORIZED", 401);

  const otherId = idParamSchema.safeParse((await params).userId);
  if (!otherId.success) return chatError("INVALID_INPUT", 400);

  const access = await canChat(session.user.id, otherId.data);
  if (access !== "ok") return chatAccessError(access);

  await markConversationRead(session.user.id, otherId.data);
  return new NextResponse(null, { status: 204 });
}
