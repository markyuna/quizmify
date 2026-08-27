import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getRequestLocale } from "@/i18n/get-locale";

export const dynamic = "force-dynamic";

const MAX_SUGGESTIONS = 6;

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const language = await getRequestLocale();

  // Cross-user on purpose -- a puzzle topic isn't sensitive, and the point
  // is to nudge new creations toward topics that already have a cached
  // image (see the topicNormalized+language cache lookup in
  // POST /api/puzzle-du-jour), regardless of who generated it first.
  const grouped = await prisma.puzzleDuJourGame.groupBy({
    by: ["topicNormalized"],
    where: { language },
    _count: { topicNormalized: true },
    _max: { createdAt: true },
    orderBy: [{ _count: { topicNormalized: "desc" } }, { _max: { createdAt: "desc" } }],
    take: MAX_SUGGESTIONS,
  });

  // groupBy only gives us the aggregate, not the row itself -- one lookup
  // per group for the exact row that produced _max.createdAt, so the
  // display text is the original `topic` (casing/accents as typed), not
  // the normalized form.
  const suggestions = await Promise.all(
    grouped.map(async (group) => {
      const row = await prisma.puzzleDuJourGame.findFirst({
        where: { topicNormalized: group.topicNormalized, language, createdAt: group._max.createdAt! },
        select: { topic: true },
      });
      return row ? { topic: row.topic, topicNormalized: group.topicNormalized } : null;
    })
  );

  return NextResponse.json({
    suggestions: suggestions.filter((s): s is { topic: string; topicNormalized: string } => s !== null),
  });
}
