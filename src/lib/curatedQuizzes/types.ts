export type CuratedQuizQuestion = {
  // Key into messages/{en,es,fr}.json's CuratedQuizzes.<definition>.titles /
  // .explanations -- resolved into the actual localized question sentence
  // and explanation server-side, at Question-row creation time, not stored
  // as plain text here. See the comment on quiEstLePeintre.ts's
  // QUI_EST_LE_PEINTRE for why.
  titleKey: string;
  imageUrl: string;
  correct_answer: string;
  // 4 entries, correct answer included, not yet shuffled -- see
  // ensureValidOptions/shuffleArray in questionGeneration.ts, applied at
  // read time by findCuratedQuiz's caller.
  options: string[];
};

export type CuratedQuizDefinition = {
  // Matched against Game.categorySlug/topic the same way AI-generated
  // topics are (see registry.ts findCuratedQuiz) -- categorySlug must be a
  // valid slug in src/lib/categories.ts, topicNormalized must equal
  // normalizeTopic(topicDisplay).
  categorySlug: string;
  topicDisplay: string;
  topicNormalized: string;
  language: string;
  difficulty: "easy" | "medium" | "hard";
  // next-intl namespace holding this definition's questionTemplate + titles
  // (see the curated branch in /api/game/route.ts, which resolves
  // question.titleKey through it for the request's own locale).
  translationNamespace: string;
  questions: CuratedQuizQuestion[];
};
