import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { createProOffer, getOfferStatesForUsers } from "@/lib/proOffers";

const bodySchema = z.object({ recipientId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { recipientId } = parsed.data;
  const senderId = session.user.id;

  if (recipientId === senderId) {
    return NextResponse.json({ outcome: "ineligible" });
  }

  // Never trust the state the candidates list showed -- re-derive it fresh
  // on every send, same stance as sendFriendRequest.
  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
  if (!recipient) {
    return NextResponse.json({ outcome: "ineligible" });
  }

  const { states, dailyLimitReached } = await getOfferStatesForUsers(senderId, [recipientId]);

  if (dailyLimitReached) {
    return NextResponse.json({ outcome: "daily_limit_reached" });
  }
  if (states[recipientId] === "invited") {
    return NextResponse.json({ outcome: "already_invited" });
  }
  if (states[recipientId] !== "invitable") {
    // Already referred or permanent Pro -- collapsed, reason hidden, same
    // stance as the candidates list itself.
    return NextResponse.json({ outcome: "ineligible" });
  }

  const outcome = await createProOffer({ senderId, recipientId });
  return NextResponse.json({ outcome });
}
