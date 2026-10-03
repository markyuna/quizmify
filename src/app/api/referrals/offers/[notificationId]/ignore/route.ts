import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { ignoreProOffer } from "@/lib/proOffers";

export async function POST(_req: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await params;
  const result = await ignoreProOffer(notificationId, session.user.id);

  if (result === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
