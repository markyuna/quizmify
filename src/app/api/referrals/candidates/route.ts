import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/nextauth";
import { getProOfferCandidates } from "@/lib/proOffers";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(50).catch(1),
});

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const { page } = querySchema.parse({ page: searchParams.get("page") ?? 1 });

  return NextResponse.json(await getProOfferCandidates(session.user.id, page));
}
