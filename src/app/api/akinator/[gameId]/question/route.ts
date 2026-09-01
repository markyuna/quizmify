import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/i18n/get-locale";
import { akinatorQuestionSchema } from "@/schemas/form/akinator";
import { answerQuestion, type AkinatorTurn } from "@/lib/akinator/ai";
import { getCharacterName } from "@/lib/akinator/characters";
import { MAX_QUESTIONS } from "@/lib/akinator/config";

type Params = { params: Promise<{ gameId: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;

  const parsed = akinatorQuestionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  }

  const game = await prisma.akinatorGame.findFirst({
    where: { id: gameId, userId: session.user.id },
  });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status !== "in_progress") {
    return NextResponse.json({ error: "GAME_OVER" }, { status: 400 });
  }
  if (game.questionsAsked >= MAX_QUESTIONS) {
    return NextResponse.json({ error: "MAX_QUESTIONS" }, { status: 400 });
  }

  const locale = await getRequestLocale();
  const priorTurns = JSON.parse(game.conversation) as AkinatorTurn[];

  const { verdict, explanation } = await answerQuestion({
    // Give the model the canonical English name; the transcript it sends
    // back is localised via the `locale` arg.
    characterName: getCharacterName(game.characterKey, "en"),
    priorTurns,
    question: parsed.data.question,
    locale,
  });

  const turn: AkinatorTurn = { question: parsed.data.question, verdict, explanation };
  const turns = [...priorTurns, turn];
  const outOfQuestions = turns.length >= MAX_QUESTIONS;

  const updated = await prisma.akinatorGame.update({
    where: { id: game.id },
    data: {
      conversation: JSON.stringify(turns),
      questionsAsked: turns.length,
    },
    select: { questionsAsked: true, status: true },
  });

  return NextResponse.json({
    turn,
    questionsAsked: updated.questionsAsked,
    questionsLeft: Math.max(0, MAX_QUESTIONS - updated.questionsAsked),
    outOfQuestions,
  });
}
