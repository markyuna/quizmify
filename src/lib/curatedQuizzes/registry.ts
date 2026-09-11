import type { CuratedQuizDefinition } from "./types";

// Add future curated topics here (image-based or otherwise hand-curated
// question sets that should bypass AI generation entirely -- see
// findCuratedQuiz's callers in /api/game/route.ts).
//
// Empty today: the only curated quiz, "Qui est le peintre?"
// (./quiEstLePeintre.ts, kept on disk for reference), was promoted to its
// own standalone game -- see src/lib/peintre/ and /app/peintre. The
// curated-quiz machinery (this registry, findCuratedQuiz, the curated
// branches in /api/game and /api/quiz/submit, the CuratedQuizCompletion
// model) is left intact for the next curated set.
export const CURATED_QUIZZES: CuratedQuizDefinition[] = [];

/**
 * Looks up a curated quiz by (categorySlug, normalized topic) only --
 * deliberately NOT the visitor's active UI locale. The curated content
 * (images + questions) only exists in one language (see `language` on
 * CuratedQuizDefinition, which is descriptive metadata, not a match key):
 * a Spanish- or English-locale visitor must still land on the same curated
 * quiz when they click the topic, not fall through to AI generation just
 * because the UI chrome is in a different language. Callers must pass the
 * topic's own canonical text (CategoryTopic.topicNormalized / a curated
 * definition's topicDisplay), never a locale-translated display label.
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
