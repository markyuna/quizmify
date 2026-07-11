import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/nextauth";
import {
  getGlobalLeaderboardPage,
  getTopicLeaderboardPage,
  LEADERBOARD_PAGE_SIZE,
} from "@/lib/leaderboard";

const querySchema = z.object({
  topic: z.string().trim().min(1).max(200).nullable(),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().int().min(5).max(50).catch(LEADERBOARD_PAGE_SIZE),
});

export async function GET(req: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    topic: searchParams.get("topic"),
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? LEADERBOARD_PAGE_SIZE,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
  }

  const { topic, page, pageSize } = parsed.data;

  const result = topic
    ? await getTopicLeaderboardPage({ topic, userId: session.user.id, page, pageSize })
    : await getGlobalLeaderboardPage({ userId: session.user.id, page, pageSize });

  return NextResponse.json(result);
}
