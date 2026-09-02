import { z } from "zod";

export const morpionMoveSchema = z.object({
  gameId: z.string().min(1),
  position: z.number().int().min(0).max(8),
});

export type MorpionMoveData = z.infer<typeof morpionMoveSchema>;

export const MORPION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const morpionDifficultySchema = z.enum(MORPION_DIFFICULTIES);

/** POST /api/morpion body -- difficulty optional; omitted = auto-computed. */
export const morpionCreateSchema = z.object({
  difficulty: morpionDifficultySchema.optional(),
});

export type MorpionDifficultyValue = z.infer<typeof morpionDifficultySchema>;
