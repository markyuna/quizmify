"use client";

import * as React from "react";
import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";

import { GUEST_GAME_KEY_VALUES } from "@/schemas/form/guestGame";

export type GuestGameKeyValue = (typeof GUEST_GAME_KEY_VALUES)[number];

const GUEST_ID_COOKIE = "quizmify_guest";
// Long enough to survive "closed the conversion modal, came back later in
// the same browser" -- the actual daily-attempt guard is server-side
// (GuestAttempt's [challengeId, guestId] unique constraint), this cookie
// only needs to outlive that gap.
const GUEST_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function createGuestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // guestId is not security-sensitive -- see isValidGuestId in
  // guestPlay.ts, it's only a partition key -- so a weaker fallback is
  // fine for environments without crypto.randomUUID.
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Returns (and lazily mints) the opaque id that partitions "one attempt per
 * guest per game per day" server-side. Mirrors the quizmify_ref cookie
 * pattern in ReferralCapture.tsx: a plain, non-httpOnly cookie set from the
 * client, stable across page reloads and across the guest closing the
 * conversion modal and coming back later in the same browser.
 */
export function useGuestId(): string | null {
  const [guestId, setGuestId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const existing = getCookie(GUEST_ID_COOKIE);
    if (existing) {
      setGuestId(existing);
      return;
    }

    const minted = createGuestId();
    document.cookie = `${GUEST_ID_COOKIE}=${encodeURIComponent(minted)}; Max-Age=${GUEST_ID_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
    setGuestId(minted);
  }, []);

  return guestId;
}

type GuestChallengeResponse = {
  challengeId: string;
  date: string;
  challenge: Record<string, unknown>;
  attempted: boolean;
};

/**
 * Fetches today's challenge for one game. Each game's own component decides
 * how to interpret `challenge` (its shape is game-specific JSON); this hook
 * only owns the day/guest plumbing shared by all 3.
 */
export function useGuestChallenge(gameKey: GuestGameKeyValue, guestId: string | null) {
  return useQuery({
    queryKey: ["guest-challenge", gameKey, guestId],
    queryFn: async () => {
      const { data } = await axios.get<GuestChallengeResponse>(`/api/guest/${gameKey}`, {
        params: guestId ? { guestId } : undefined,
      });
      return data;
    },
    enabled: guestId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

type SubmitGuestAnswerParams = {
  gameKey: GuestGameKeyValue;
  guestId: string;
  answer: unknown;
};

type SubmitGuestAnswerResponse = {
  success: boolean;
  attemptId: string;
  alreadyPlayed: boolean;
  // True only when the browser was already signed in at submit time -- the
  // server claims immediately in that case and includes the real result
  // below instead of gating it behind ConversionModal. Absent/false for an
  // actual guest, whose isCorrect/resultPayload/xpAwarded are never sent.
  claimed: boolean;
  isCorrect?: boolean;
  resultPayload?: Record<string, unknown>;
  xpAwarded?: number;
};

/**
 * Submits a guest's single daily answer. For an actual (not yet
 * authenticated) guest, the response deliberately carries no
 * correctness/XP -- the server never reveals the result pre-registration
 * (see api/guest/[gameKey]/submit/route.ts). A successful call in that case
 * just means "recorded, now show the ConversionModal." If the browser
 * turns out to already be signed in, the response is claimed immediately
 * and includes the real result instead.
 */
export function useSubmitGuestAnswer() {
  return useMutation({
    mutationFn: async ({ gameKey, guestId, answer }: SubmitGuestAnswerParams) => {
      const { data } = await axios.post<SubmitGuestAnswerResponse>(`/api/guest/${gameKey}/submit`, {
        guestId,
        answer,
      });
      return data;
    },
  });
}
