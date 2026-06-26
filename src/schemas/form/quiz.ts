import { z } from "zod";

export const quizCreationSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(200, "Topic is too long"),
  amount: z.number().int().min(1, "Minimum is 1").max(20, "Maximum is 20"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  type: z.literal("mcq"),
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
      })
    )
    .min(1, "At least one answer is required"),
});
