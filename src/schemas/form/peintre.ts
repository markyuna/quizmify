import { z } from "zod";

import { PEINTRE_QUESTION_COUNT } from "@/lib/peintre/config";

export const peintreCreateSchema = z.object({
  deckKey: z.string().trim().min(1).max(64),
});

export const peintreSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        index: z.number().int().min(0).max(PEINTRE_QUESTION_COUNT - 1),
        selected: z.string().max(120),
      })
    )
    .length(PEINTRE_QUESTION_COUNT),
});

export type PeintreCreateData = z.infer<typeof peintreCreateSchema>;
export type PeintreSubmitData = z.infer<typeof peintreSubmitSchema>;
