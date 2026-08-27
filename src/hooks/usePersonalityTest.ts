"use client";

import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";

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
  // True when the browser was already authenticated at submit time -- the
  // attempt was stamped claimed server-side. The result modal uses this to
  // decide what "Confirmar" does: call /confirm directly (claimed), or open
  // the registration flow and let the existing guest -> account claim fix
  // the animal once they sign up (not claimed).
  claimed: boolean;
  // Always present now -- the result is shown to guest and logged-in
  // callers alike, neither of which fixes anything on User yet.
  resultKey: string;
  scores: Record<string, number>;
  // Top-3 category slugs eligible for recommendation (scored > 0 *and* has
  // playable CategoryTopic content) -- see getRecommendedCategorySlugs().
  recommendations: string[];
};

/**
 * Submits all 13 answers at once (unlike the daily games' single-answer
 * submit) and gets back the scored result plus recommendations, for the
 * result modal to show immediately -- regardless of auth state.
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

type ConfirmPersonalityTestParams = {
  testKey: "quel_animal_es_tu";
  attemptId: string;
};

/** Logged-in only -- see /api/personality-tests/[testKey]/confirm/route.ts. */
export function useConfirmPersonalityTest() {
  return useMutation({
    mutationFn: async ({ testKey, attemptId }: ConfirmPersonalityTestParams) => {
      const { data } = await axios.post(`/api/personality-tests/${testKey}/confirm`, { attemptId });
      return data;
    },
  });
}

type RetryPersonalityTestParams = {
  testKey: "quel_animal_es_tu";
  attemptId: string;
  guestId: string;
};

/** Deletes a rejected attempt so the test can start over from question 1. */
export function useRetryPersonalityTest() {
  return useMutation({
    mutationFn: async ({ testKey, attemptId, guestId }: RetryPersonalityTestParams) => {
      const { data } = await axios.post(`/api/personality-tests/${testKey}/retry`, { attemptId, guestId });
      return data;
    },
  });
}

type PersonalityAnimalStatusResponse = { hasAnimal: boolean; lastMascotNudgeDismissedAt: string | null };

/**
 * Whether the current session already has a permanent result -- drives the
 * "ya tenés tu mascota" gate. Only meaningful for a logged-in visitor (a
 * guest is trivially false), so callers should pass `enabled: isAuthenticated`.
 */
export function usePersonalityAnimalStatus(enabled: boolean) {
  return useQuery({
    queryKey: ["personality-animal-status", "quel_animal_es_tu"],
    queryFn: async () => {
      const { data } = await axios.get<PersonalityAnimalStatusResponse>(
        "/api/personality-tests/quel_animal_es_tu/status"
      );
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** Logged-in only -- see /api/personality-tests/mascot-nudge-dismiss. */
export function useDismissMascotNudge() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/personality-tests/mascot-nudge-dismiss");
      return data;
    },
  });
}
