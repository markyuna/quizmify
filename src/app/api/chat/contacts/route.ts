import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/nextauth";
import { listChatContacts } from "@/lib/chat";
import { chatError } from "@/lib/chatApi";

const querySchema = z.object({
  q: z.string().trim().max(50).catch(""),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return chatError("UNAUTHORIZED", 401);

  const { searchParams } = new URL(req.url);
  const { q, page } = querySchema.parse({ q: searchParams.get("q") ?? "", page: searchParams.get("page") ?? 1 });

  // listChatContacts applies the full query to friends only; non-friends
  // match on its first word as a name prefix (see its doc comment).
  return NextResponse.json(await listChatContacts(session.user.id, { query: q, page }));
}
