import { z } from "zod";

export const akinatorQuestionSchema = z.object({
  question: z.string().trim().min(1).max(200),
});

export const akinatorGuessSchema = z.object({
  guess: z.string().trim().min(1).max(100),
});

export type AkinatorQuestionData = z.infer<typeof akinatorQuestionSchema>;
export type AkinatorGuessData = z.infer<typeof akinatorGuessSchema>;
