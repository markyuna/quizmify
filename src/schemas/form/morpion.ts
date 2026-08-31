import { z } from "zod";

export const morpionMoveSchema = z.object({
  gameId: z.string().min(1),
  position: z.number().int().min(0).max(8),
});

export type MorpionMoveData = z.infer<typeof morpionMoveSchema>;
