export type CuratedQuizQuestion = {
  question: string;
  imageUrl: string;
  correct_answer: string;
  // 4 entries, correct answer included, not yet shuffled -- see
  // ensureValidOptions/shuffleArray in questionGeneration.ts, applied at
  // read time by findCuratedQuiz's caller.
  options: string[];
  explanation: string;
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
  questions: CuratedQuizQuestion[];
};
