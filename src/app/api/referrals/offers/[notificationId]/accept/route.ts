import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { acceptProOffer } from "@/lib/proOffers";

export async function POST(_req: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await params;

  let result;
  try {
    result = await acceptProOffer(notificationId, session.user.id);
  } catch (error) {
    console.error("accept pro offer failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  if (result.outcome === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result.outcome === "already_referred") {
    return NextResponse.json({ error: "Already referred" }, { status: 409 });
  }

  return NextResponse.json({ success: true, rewardDays: result.rewardDays });
}
