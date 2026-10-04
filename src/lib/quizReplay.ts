import type { Game } from "@/generated/prisma/client";

/**
 * "Rejouer" link for a finished MCQ game: back to /quiz with the same topic,
 * category, difficulty and question count prefilled, so a replay doesn't
 * silently fall back to QuizCreation's defaults (easy, 5 questions, no
 * category scope). The questions themselves are always fresh -- /api/game
 * excludes everything this player already saw on the topic (see
 * getSeenQuestionTexts).
 */
export function buildQuizReplayHref(
  game: Pick<Game, "topic" | "categorySlug" | "difficulty" | "plannedQuestionCount">,
  servedQuestionCount: number
): string {
  const params = new URLSearchParams({ topic: game.topic });
  if (game.categorySlug) params.set("category", game.categorySlug);
  if (game.difficulty) params.set("difficulty", game.difficulty);
  // An adaptive game only holds its first batch until next-batch runs, so
  // plannedQuestionCount is the real requested amount when it's set.
  params.set("amount", String(game.plannedQuestionCount ?? servedQuestionCount));
  return `/quiz?${params.toString()}`;
}
