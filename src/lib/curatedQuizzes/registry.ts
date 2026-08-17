import { QUI_EST_LE_PEINTRE } from "./quiEstLePeintre";
import type { CuratedQuizDefinition } from "./types";

// Add future curated topics here (image-based or otherwise hand-curated
// question sets that should bypass AI generation entirely -- see
// findCuratedQuiz's callers in /api/game/route.ts and QuizCreation.tsx).
export const CURATED_QUIZZES: CuratedQuizDefinition[] = [QUI_EST_LE_PEINTRE];

/**
 * Looks up a curated quiz by (categorySlug, normalized topic) only --
 * deliberately NOT the visitor's active UI locale. The curated content
 * (images + questions) only exists in one language (see `language` on
 * CuratedQuizDefinition, which is descriptive metadata, not a match key):
 * a Spanish- or English-locale visitor must still land on the same curated
 * quiz when they click the topic, not fall through to AI generation just
 * because the UI chrome is in a different language. Callers must pass the
 * topic's own canonical text (CategoryTopic.topicNormalized / a curated
 * definition's topicDisplay), never a locale-translated display label --
 * see CategoryQuizCard.tsx for why that distinction matters.
 */
export function findCuratedQuiz(
  categorySlug: string | null | undefined,
  topicNormalized: string
): CuratedQuizDefinition | null {
  if (!categorySlug) return null;

  return (
    CURATED_QUIZZES.find(
      (quiz) => quiz.categorySlug === categorySlug && quiz.topicNormalized === topicNormalized
    ) ?? null
  );
}
