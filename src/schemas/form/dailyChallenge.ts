import { z } from "zod";

export const submitDailyChallengeSchema = z.object({
  dailyChallengeId: z.string().min(1, "Daily challenge ID is required"),
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
