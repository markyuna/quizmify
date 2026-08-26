import { z } from "zod";

export const quizCreationSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(200, "Topic is too long"),
  amount: z.number().int().min(1, "Minimum is 1").max(20, "Maximum is 20"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  type: z.literal("mcq"),
  isTimed: z.boolean(),
  puzzleMode: z.boolean(),
  // Required (as of the category-mandatory change): every quiz, guest or
  // authenticated, must be tied to a real category before it can be
  // created -- lets question generation scope itself to that category's
  // context. Validated against CATEGORIES server-side in /api/game, which
  // also persists it onto Game.categorySlug -- the source /api/quiz/submit
  // later reads to publish a CategoryTopic row (see prisma/schema.prisma).
  // POST /api/game re-parses this exact schema against the raw request
  // body, so this alone is already the server-side guard -- no separate
  // check needed there.
  categorySlug: z.string().min(1, "categoryRequired"),
});

export const checkAnswerSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  userAnswer: z.string().min(1, "Answer is required").max(1000, "Answer is too long"),
});

export const submitQuizSchema = z.object({
  gameId: z.string().min(1, "Game ID is required"),
  timeSpent: z.number().int().min(0, "Time spent must be 0 or more"),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1, "Question ID is required"),
        selectedAnswer: z.string().min(1, "Selected answer is required"),
        responseTimeMs: z.number().int().min(0).optional(),
      })
    )
    .min(1, "At least one answer is required"),
});
