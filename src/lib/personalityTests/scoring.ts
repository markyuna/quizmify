import {
  ANIMAL_KEYS,
  CATEGORY_SLUGS,
  QUESTIONS,
  type AnimalKey,
  type CategorySlug,
  type PersonalityTestOption,
} from "./quelAnimalEsTu.config";

export type PersonalityTestAnswer = { questionId: string; optionId: string };

const OPTIONS_BY_ID = new Map<string, { questionId: string; option: PersonalityTestOption }>();
for (const question of QUESTIONS) {
  for (const option of question.options) {
    OPTIONS_BY_ID.set(option.id, { questionId: question.id, option });
  }
}

export class InvalidPersonalityTestAnswersError extends Error {}

/**
 * Sums each answer's option weights into a per-animal score. Every option
 * id is revalidated against the question it claims to belong to (never
 * trusting the client's pairing), and exactly one answer per question is
 * required -- same "server recomputes everything from scratch" posture as
 * MathTarget's isDerivationValid.
 */
export function computeResult(answers: PersonalityTestAnswer[]): {
  scores: Record<AnimalKey, number>;
  resultKey: AnimalKey;
  // Every category with score > 0, from the Q9-13 thematic axis --
  // independent of scores/resultKey above, highest first (ties broken by
  // catalog order in CATEGORY_SLUGS). Not trimmed to a top N here: which
  // categories end up recommended also depends on which ones have
  // CategoryTopic content, decided later by getRecommendedCategorySlugs()
  // in recommendations.ts -- trimming here would throw away categories a
  // future seed makes eligible. Empty object if every categoryWeights
  // option scored 0 (shouldn't happen given the fixed question set, but not
  // assumed).
  categoryScores: Partial<Record<CategorySlug, number>>;
} {
  if (answers.length !== QUESTIONS.length) {
    throw new InvalidPersonalityTestAnswersError(`Expected ${QUESTIONS.length} answers, got ${answers.length}`);
  }

  const seenQuestionIds = new Set<string>();
  const scores = Object.fromEntries(ANIMAL_KEYS.map((key) => [key, 0])) as Record<AnimalKey, number>;
  const categoryTotals = Object.fromEntries(CATEGORY_SLUGS.map((slug) => [slug, 0])) as Record<CategorySlug, number>;

  for (const answer of answers) {
    const entry = OPTIONS_BY_ID.get(answer.optionId);
    if (!entry || entry.questionId !== answer.questionId) {
      throw new InvalidPersonalityTestAnswersError(`Unknown or mismatched option "${answer.optionId}"`);
    }
    if (seenQuestionIds.has(answer.questionId)) {
      throw new InvalidPersonalityTestAnswersError(`Duplicate answer for question "${answer.questionId}"`);
    }
    seenQuestionIds.add(answer.questionId);

    for (const [animal, weight] of Object.entries(entry.option.weights)) {
      scores[animal as AnimalKey] += weight ?? 0;
    }
    for (const [category, weight] of Object.entries(entry.option.categoryWeights ?? {})) {
      categoryTotals[category as CategorySlug] += weight ?? 0;
    }
  }

  // Deterministic tie-break: first animal in ANIMAL_KEYS order among those
  // sharing the max score. A tie is possible (any 2-3-per-option design
  // can't rule it out for every combination of picks) but not the norm --
  // see the primary/secondary spread in quelAnimalEsTu.config.ts.
  let resultKey: AnimalKey = ANIMAL_KEYS[0];
  for (const key of ANIMAL_KEYS) {
    if (scores[key] > scores[resultKey]) resultKey = key;
  }

  // Same tie-break idea for categories: map from CATEGORY_SLUGS order
  // (already catalog-ordered) before sorting, and rely on Array.sort's
  // stability (guaranteed since ES2019) to keep ties in that catalog order
  // rather than picking a separate tie-break pass.
  const categoryScores = Object.fromEntries(
    CATEGORY_SLUGS.map((slug) => ({ slug, score: categoryTotals[slug] }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ slug, score }) => [slug, score])
  ) as Partial<Record<CategorySlug, number>>;

  return { scores, resultKey, categoryScores };
}
