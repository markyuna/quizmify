import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { getTodayDateKey } from "@/lib/guestPlay";
import { calculateLevel } from "@/lib/xp";
import { FREE_LEVEL_CAP, FREE_XP_CAP } from "@/lib/stripe";
import {
  PEINTRE_GAME_KEY,
  PEINTRE_QUESTION_COUNT,
  PEINTRE_XP_BASE,
  PEINTRE_XP_PERFECT_BONUS,
} from "@/lib/peintre/config";
import { findPeintreDeck, type PeintreDeck } from "@/lib/peintre/decks";
import { peintreSubmitSchema } from "@/schemas/form/peintre";
import type { Locale } from "@/i18n/locales";

type Params = { params: Promise<{ gameId: string }> };

type StoredAnswer = { index: number; selected: string };
type ResultRow = {
  index: number;
  selected: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
};

const answerEquals = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** Per-question feedback for the result screen, built from stored picks. */
function buildResults(
  deck: PeintreDeck,
  answers: StoredAnswer[],
  t: (key: string) => string
): ResultRow[] {
  const bySlot = new Map(answers.map((a) => [a.index, a.selected]));
  return deck.questions.map((q, index) => {
    const selected = bySlot.get(index) ?? "";
    return {
      index,
      selected,
      correctAnswer: q.correct_answer,
      correct: answerEquals(selected, q.correct_answer),
      explanation: t(`decks.${deck.deckKey}.explanations.${q.slug}`),
    };
  });
}

/**
 * Grade the 10 picks against the deck. On a full submit it flips the game to
 * `completed` via a conditional updateMany (so a double-submit can't
 * double-credit XP) and awards flat XP -- PEINTRE_XP_BASE for finishing, plus
 * PEINTRE_XP_PERFECT_BONUS for a 10/10 -- with the same "xp accrues, level
 * capped for free users" block as /api/crucigrama/[gameId]/submit.
 */
export async function POST(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { gameId } = await params;

  let parsed;
  try {
    parsed = peintreSubmitSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }
    throw error;
  }

  const game = await prisma.peintreGame.findFirst({ where: { id: gameId, userId } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const deck = findPeintreDeck(game.deckKey);
  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const t = await getTranslations({
    locale: game.language as Locale,
    namespace: "Peintre",
  });

  // Already finished (a refresh after completing, or a lost double-submit
  // race): return the persisted result so the client renders the same
  // summary.
  if (game.status !== "in_progress") {
    const stored = JSON.parse(game.answers) as StoredAnswer[];
    const results = buildResults(deck, stored, t);
    return NextResponse.json({
      alreadyCompleted: true,
      score: game.score,
      xpEarned: game.xpEarned,
      perfect: game.score === PEINTRE_QUESTION_COUNT,
      hitFreeLimit: false,
      results,
    });
  }

  // Dedupe by index (schema already enforces exactly 10 entries).
  const uniqueAnswers = Array.from(
    new Map(parsed.answers.map((a) => [a.index, a.selected])).entries()
  ).map(([index, selected]) => ({ index, selected }));

  const results = buildResults(deck, uniqueAnswers, t);
  const score = results.filter((r) => r.correct).length;
  const perfect = score === PEINTRE_QUESTION_COUNT;
  const xpAward = PEINTRE_XP_BASE + (perfect ? PEINTRE_XP_PERFECT_BONUS : 0);

  const result = await prisma.$transaction(async (tx) => {
    // Conditional flip -- only the request that moves the row out of
    // in_progress credits XP, so a double-submit can't double-pay.
    const flipped = await tx.peintreGame.updateMany({
      where: { id: gameId, status: "in_progress" },
      data: {
        status: "completed",
        score,
        xpEarned: xpAward,
        answers: JSON.stringify(uniqueAnswers),
        completedAt: new Date(),
      },
    });
    if (flipped.count === 0) return { hitFreeLimit: false };

    const previousUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { level: true, subscriptionStatus: true, premiumUntil: true },
    });
    const isPro = isEffectivelyPro(previousUser);

    // xp always accrues; only the *level* is capped for free users -- same
    // invariant as /api/quiz/submit and /api/crucigrama/[gameId]/submit.
    const { xp: newXp } = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: xpAward } },
      select: { xp: true },
    });
    const trueLevel = calculateLevel(newXp);
    const newLevel = isPro ? trueLevel : Math.min(trueLevel, FREE_LEVEL_CAP);
    if (newLevel !== previousUser.level) {
      await tx.user.update({ where: { id: userId }, data: { level: newLevel } });
    }

    // Pro's first *completed* game of the day is free -- mark it here, the
    // point "completed" becomes true. check-then-create (a bare create
    // hitting the unique constraint would abort this $transaction).
    if (isPro) {
      const dateKey = getTodayDateKey();
      const alreadyFree = await tx.userDailyFreeGame.findUnique({
        where: {
          userId_gameKey_date: { userId, gameKey: PEINTRE_GAME_KEY, date: dateKey },
        },
        select: { id: true },
      });
      if (!alreadyFree) {
        await tx.userDailyFreeGame.create({
          data: { userId, gameKey: PEINTRE_GAME_KEY, date: dateKey, gameId },
        });
      }
    }

    return { hitFreeLimit: !isPro && newXp >= FREE_XP_CAP };
  });

  return NextResponse.json({
    score,
    xpEarned: xpAward,
    perfect,
    hitFreeLimit: result.hitFreeLimit,
    results,
  });
}
