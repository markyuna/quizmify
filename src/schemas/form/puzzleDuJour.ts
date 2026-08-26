import { z } from "zod";

export const puzzleDuJourCreateSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(200, "Topic is too long"),
  difficulty: z.enum(["easy", "medium", "hard"]),
});
