import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { markAllNotificationsRead } from "@/lib/inAppNotifications";

export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await markAllNotificationsRead(session.user.id);
  return new NextResponse(null, { status: 204 });
}
