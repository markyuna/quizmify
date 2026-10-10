import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { getChatUnreadCount } from "@/lib/chat";
import { chatError } from "@/lib/chatApi";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return chatError("UNAUTHORIZED", 401);

  return NextResponse.json({ count: await getChatUnreadCount(session.user.id) });
}
