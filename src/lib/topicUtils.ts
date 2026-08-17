// Pure, dependency-free helpers split out of questionGeneration.ts so they
// can be imported from client components (e.g. QuizCreation.tsx) without
// pulling in questionGeneration.ts's `import { openai } from "@/lib/openai"`
// -- that import throws at module-evaluation time when OPENAI_API_KEY isn't
// present in the bundle, which is always true client-side, and previously
// broke the entire /quiz page the moment anything here got imported from a
// "use client" file. questionGeneration.ts re-exports both of these so every
// existing server-side import of them is unaffected.

export type Difficulty = "easy" | "medium" | "hard";

export function normalizeTopic(topic: string): string {
  return topic.trim().replace(/\s+/g, " ");
}

export function normalizeDifficulty(difficulty: Difficulty): Difficulty {
  return difficulty.toLowerCase() as Difficulty;
}
