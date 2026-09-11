import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { ensureValidOptions } from "@/lib/questionGeneration";
import { findPeintreDeck, peintreImageUrl } from "@/lib/peintre/decks";
import type { Locale } from "@/i18n/locales";

type Params = { params: Promise<{ gameId: string }> };
type StoredAnswer = { index: number; selected: string };

const answerEquals = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Load one game for the play page / a refresh.
 *
 * While `in_progress`: the artwork image, the localized question sentence
 * and the (shuffled) 4 options go to the client; correct answers and
 * explanations do NOT (grading is done in [gameId]/submit).
 *
 * Once `completed`: the full per-question result (correct answer +
 * explanation + the player's pick) is returned, so a refresh lands straight
 * on the summary screen without re-submitting.
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;
  const game = await prisma.peintreGame.findFirst({
    where: { id: gameId, userId: session.user.id },
  });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const deck = findPeintreDeck(game.deckKey);
  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  // Resolved through the locale the game was created in (game.language), so a
  // refresh always reads the same text.
  const t = await getTranslations({ locale: game.language as Locale, namespace: "Peintre" });
  const titleOf = (slug: string) => t(`decks.${deck.deckKey}.titles.${slug}`);

  if (game.status === "completed") {
    const stored = JSON.parse(game.answers) as StoredAnswer[];
    const bySlot = new Map(stored.map((a) => [a.index, a.selected]));
    const results = deck.questions.map((q, index) => {
      const selected = bySlot.get(index) ?? "";
      return {
        index,
        imageUrl: peintreImageUrl(deck, q.slug),
        questionText: t("questionTemplate", { title: titleOf(q.slug) }),
        selected,
        correctAnswer: q.correct_answer,
        correct: answerEquals(selected, q.correct_answer),
        explanation: t(`decks.${deck.deckKey}.explanations.${q.slug}`),
      };
    });
    return NextResponse.json({
      id: game.id,
      deckKey: game.deckKey,
      status: "completed",
      score: game.score,
      xpEarned: game.xpEarned,
      results,
    });
  }

  const questions = deck.questions.map((q, index) => ({
    index,
    imageUrl: peintreImageUrl(deck, q.slug),
    questionText: t("questionTemplate", { title: titleOf(q.slug) }),
    options: ensureValidOptions(q.options, q.correct_answer),
  }));

  return NextResponse.json({
    id: game.id,
    deckKey: game.deckKey,
    status: "in_progress",
    questions,
  });
}
