import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { listNotifications } from "@/lib/inAppNotifications";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listNotifications(session.user.id));
}
