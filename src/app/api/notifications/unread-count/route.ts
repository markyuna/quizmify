import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { getUnreadNotificationCount } from "@/lib/inAppNotifications";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await getUnreadNotificationCount(session.user.id);
  return NextResponse.json({ count });
}
