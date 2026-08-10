"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
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

/**
 * Migrates a guest's daily game attempt(s) onto their account the moment
 * they authenticate, however they got there (Google OAuth, email register,
 * or plain login on a device where they already have an account). Mirrors
 * ReferralCapture.tsx's cookie + retry pattern exactly: mounted once in the
 * root layout, which Next.js does not remount on client-side navigation, so
 * this depends on `pathname` (not a one-shot effect) to get a fresh chance
 * to claim on every route change until the server stops saying
 * "unauthenticated" -- which covers a guest closing the ConversionModal and
 * completing signup on a later page load entirely.
 */
export default function GuestRoundClaim() {
  const pathname = usePathname();
  const { toast } = useToast();
  const t = useTranslations("GuestGames.claim");

  React.useEffect(() => {
    if (sessionStorage.getItem(CLAIM_ATTEMPTED_FLAG)) return;

    const guestId = getCookie(GUEST_ID_COOKIE);
    if (!guestId) return;

    fetch("/api/guest/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));

        // Not authenticated yet -- leave the cookie and the flag alone so a
        // later, authenticated page load retries instead of this premature
        // attempt permanently swallowing the claim.
        if (data?.reason === "unauthenticated") return;

        sessionStorage.setItem(CLAIM_ATTEMPTED_FLAG, "1");
        clearCookie(GUEST_ID_COOKIE);

        if (data?.success && data.claimedCount > 0) {
          toast({
            title: t("toastTitle"),
            description: t("toastDescription", { xp: data.xpAwarded }),
          });
        }
      })
      .catch(() => {
        /* network hiccup -- leave everything alone, retry on next page */
      });
  }, [pathname, toast, t]);

  return null;
}
