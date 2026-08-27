import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getRequestLocale } from "@/i18n/get-locale";

export const dynamic = "force-dynamic";

const MAX_SUGGESTIONS = 6;

type TopicGroup = { topicNormalized: string; _max: { createdAt: Date | null } };
type TopicSuggestion = { topic: string; topicNormalized: string };

// groupBy only gives us the aggregate, not the row itself -- one lookup per
// group for the exact row that produced _max.createdAt, so the display text
// is the original `topic` (casing/accents as typed), not the normalized
// form. `language` is passed only for the same-language groups (whose
// _count was computed within that language); the any-language fallback
// groups below aggregate across languages, so their row lookup doesn't
// filter by one.
async function resolveTopics(groups: TopicGroup[], language?: string): Promise<TopicSuggestion[]> {
  const rows = await Promise.all(
    groups.map(async (group) => {
      const row = await prisma.puzzleDuJourGame.findFirst({
        where: {
          topicNormalized: group.topicNormalized,
          createdAt: group._max.createdAt!,
          ...(language ? { language } : {}),
        },
        select: { topic: true },
      });
      return row ? { topic: row.topic, topicNormalized: group.topicNormalized } : null;
    })
  );
  return rows.filter((s): s is TopicSuggestion => s !== null);
}

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
  const sameLanguageGroups = await prisma.puzzleDuJourGame.groupBy({
    by: ["topicNormalized"],
    where: { language },
    _count: { topicNormalized: true },
    _max: { createdAt: true },
    orderBy: [{ _count: { topicNormalized: "desc" } }, { _max: { createdAt: "desc" } }],
    take: MAX_SUGGESTIONS,
  });
  const sameLanguageSuggestions = await resolveTopics(sameLanguageGroups, language);

  // Fallback: the locale cookie is per-browser, not per-account (see
  // src/i18n/get-locale.ts) -- a device that never touched the language
  // switcher resolves a different `language` than the one active when
  // earlier puzzles were created, which made a strict same-language filter
  // come back empty on that device even though plenty of topics exist.
  // Fill any remaining slots from any language, excluding topics already
  // picked above, same popularity/recency ordering.
  const remaining = MAX_SUGGESTIONS - sameLanguageSuggestions.length;
  let fallbackSuggestions: TopicSuggestion[] = [];
  if (remaining > 0) {
    const exclude = sameLanguageGroups.map((g) => g.topicNormalized);
    const fallbackGroups = await prisma.puzzleDuJourGame.groupBy({
      by: ["topicNormalized"],
      where: { topicNormalized: { notIn: exclude } },
      _count: { topicNormalized: true },
      _max: { createdAt: true },
      orderBy: [{ _count: { topicNormalized: "desc" } }, { _max: { createdAt: "desc" } }],
      take: remaining,
    });
    fallbackSuggestions = await resolveTopics(fallbackGroups);
  }

  return NextResponse.json({ suggestions: [...sameLanguageSuggestions, ...fallbackSuggestions] });
}
