"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/ui/use-toast";

const GUEST_ID_COOKIE = "quizmify_guest";
const CLAIM_ATTEMPTED_FLAG = "quizmify:guest-claim-attempted";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

type ClaimResponse = {
  reason?: string;
  success?: boolean;
  claimedCount?: number;
  xpAwarded?: number;
};

type ClaimQuizResponse = ClaimResponse & { gameId?: string | null };

// Personality-test attempts carry no XP and have no result page yet (see
// getClaimedPersonalityTestAttempt in personalityTests/attempts.ts) -- just
// claimedCount, no xpAwarded/gameId to fold in.
type ClaimPersonalityTestResponse = ClaimResponse;

/**
 * Migrates a guest's daily game attempt(s), their played-but-unclaimed quiz
 * (see /api/guest/claim-quiz), *and* any personality-test attempt (see
 * /api/personality-tests/claim) onto their account the moment they
 * authenticate, however they got there (Google OAuth, email register, or
 * plain login on a device where they already have an account). Mirrors
 * ReferralCapture.tsx's cookie + retry pattern exactly: mounted once in the
 * root layout, which Next.js does not remount on client-side navigation, so
 * this depends on `pathname` (not a one-shot effect) to get a fresh chance
 * to claim on every route change until the server stops saying
 * "unauthenticated" -- which covers a guest closing the ConversionModal and
 * completing signup on a later page load entirely.
 */
export default function GuestRoundClaim() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("GuestGames.claim");

  React.useEffect(() => {
    if (sessionStorage.getItem(CLAIM_ATTEMPTED_FLAG)) return;

    const guestId = getCookie(GUEST_ID_COOKIE);
    if (!guestId) return;

    Promise.all([
      fetch("/api/guest/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      }).then((res) => res.json().catch(() => ({}))) as Promise<ClaimResponse>,
      fetch("/api/guest/claim-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      }).then((res) => res.json().catch(() => ({}))) as Promise<ClaimQuizResponse>,
      fetch("/api/personality-tests/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      }).then((res) => res.json().catch(() => ({}))) as Promise<ClaimPersonalityTestResponse>,
    ])
      .then(([roundsData, quizData, personalityTestData]) => {
        // Any endpoint reporting "still unauthenticated" means the account
        // didn't actually exist yet when this fired (e.g. still on the
        // registration form) -- leave the cookie and the flag alone so a
        // later, authenticated page load retries all of them together
        // instead of this premature attempt permanently swallowing the claim.
        if (
          roundsData?.reason === "unauthenticated" ||
          quizData?.reason === "unauthenticated" ||
          personalityTestData?.reason === "unauthenticated"
        )
          return;

        sessionStorage.setItem(CLAIM_ATTEMPTED_FLAG, "1");
        clearCookie(GUEST_ID_COOKIE);

        const claimedAnything =
          (roundsData?.success && (roundsData.claimedCount ?? 0) > 0) ||
          (quizData?.success && (quizData.claimedCount ?? 0) > 0) ||
          (personalityTestData?.success && (personalityTestData.claimedCount ?? 0) > 0);

        if (claimedAnything) {
          const totalXp = (roundsData?.xpAwarded ?? 0) + (quizData?.xpAwarded ?? 0);
          toast({
            title: t("toastTitle"),
            description: t("toastDescription", { xp: totalXp }),
          });
        }

        // A claimed quiz has a real result now -- send them straight to it
        // instead of leaving them on whatever page they registered from.
        if (quizData?.success && quizData.gameId) {
          router.push(`/statistics/${quizData.gameId}`);
        }
      })
      .catch(() => {
        /* network hiccup -- leave everything alone, retry on next page */
      });
  }, [pathname, toast, t, router]);

  return null;
}
