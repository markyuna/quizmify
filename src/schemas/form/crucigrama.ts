import { z } from "zod";

export const crucigramaCreateSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required").max(200, "Topic is too long"),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const crucigramaSubmitSchema = z.object({
  // Filled letters keyed by "row,col". Uppercase A-Z / Ñ -- the grid never
  // shows accents, so neither does the submission.
  cells: z.record(z.string(), z.string().max(1)),
});

export type CrucigramaCreateData = z.infer<typeof crucigramaCreateSchema>;
export type CrucigramaSubmitData = z.infer<typeof crucigramaSubmitSchema>;
