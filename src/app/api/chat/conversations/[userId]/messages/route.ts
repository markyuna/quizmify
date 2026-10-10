import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/nextauth";
import { CHAT_MESSAGE_MAX_LENGTH, canChat, listChatMessages, sendChatMessage } from "@/lib/chat";
import { chatAccessError, chatError, idParamSchema } from "@/lib/chatApi";

type Params = { params: Promise<{ userId: string }> };

const listQuerySchema = z.object({ before: idParamSchema.optional() });
const sendBodySchema = z.object({ body: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH) });

export async function GET(req: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) return chatError("UNAUTHORIZED", 401);

  const otherId = idParamSchema.safeParse((await params).userId);
  const query = listQuerySchema.safeParse({ before: new URL(req.url).searchParams.get("before") ?? undefined });
  if (!otherId.success || !query.success) return chatError("INVALID_INPUT", 400);

  const access = await canChat(session.user.id, otherId.data);
  if (access !== "ok") return chatAccessError(access);

  return NextResponse.json(await listChatMessages(session.user.id, otherId.data, { before: query.data.before }));
}

export async function POST(req: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) return chatError("UNAUTHORIZED", 401);

  const otherId = idParamSchema.safeParse((await params).userId);
  const parsed = sendBodySchema.safeParse(await req.json().catch(() => null));
  if (!otherId.success || !parsed.success) return chatError("INVALID_INPUT", 400);

  const result = await sendChatMessage(session.user.id, otherId.data, parsed.data.body);
  if (!result.ok) {
    return result.reason === "rate_limited"
      ? chatError("RATE_LIMITED", 429, { retryAfterMs: result.retryAfterMs })
      : chatAccessError(result.reason);
  }
  return NextResponse.json({ message: result.message }, { status: 201 });
}
