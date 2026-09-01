import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/i18n/get-locale";
import { getCharacterName } from "@/lib/akinator/characters";
import { MAX_QUESTIONS } from "@/lib/akinator/config";
import type { AkinatorTurn } from "@/lib/akinator/ai";

type Params = { params: Promise<{ gameId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;
  const game = await prisma.akinatorGame.findFirst({
    where: { id: gameId, userId: session.user.id },
  });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const locale = await getRequestLocale();
  const over = game.status !== "in_progress";

  return NextResponse.json({
    id: game.id,
    status: game.status,
    questionsAsked: game.questionsAsked,
    questionLimit: MAX_QUESTIONS,
    imageUrl: game.imageUrl,
    turns: JSON.parse(game.conversation) as AkinatorTurn[],
    score: game.score,
    xpEarned: game.xpEarned,
    guessedName: game.guessedName,
    // Only reveal the answer once the game is over.
    characterName: over ? getCharacterName(game.characterKey, locale) : null,
  });
}
