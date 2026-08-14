"use client";

import axios from "axios";
import { useMutation } from "@tanstack/react-query";

export { useGuestId } from "@/hooks/useGuestRound";

type PersonalityTestAnswer = { questionId: string; optionId: string };

type SubmitPersonalityTestParams = {
  testKey: "quel_animal_es_tu";
  guestId: string;
  answers: PersonalityTestAnswer[];
};

type SubmitPersonalityTestResponse = {
  success: boolean;
  attemptId: string;
  // True only if the browser was already signed in -- claimed immediately
  // server-side, with the real result included instead of gating it behind
  // ConversionModal. See useSubmitGuestAnswer's identical contract.
  claimed: boolean;
  resultKey?: string;
  scores?: Record<string, number>;
};

/**
 * Submits all 8 answers at once (unlike the daily games' single-answer
 * submit) and gets back either the real result (already signed in) or just
 * an attemptId to show behind ConversionModal.
 */
export function useSubmitPersonalityTest() {
  return useMutation({
    mutationFn: async ({ testKey, guestId, answers }: SubmitPersonalityTestParams) => {
      const { data } = await axios.post<SubmitPersonalityTestResponse>(`/api/personality-tests/${testKey}/submit`, {
        guestId,
        answers,
      });
      return data;
    },
  });
}
