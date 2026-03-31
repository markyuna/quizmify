import { z } from "zod";

export const QuizQuestionSchema = z.object({
  question: z.string().min(10),
  options: z.array(z.string().min(1)).length(4),
  correct_answer: z.string().min(1),
  explanation: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const QuizQuestionsSchema = z.array(QuizQuestionSchema).min(1).max(20);

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;