"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

const COOKIE_NAME = "quizmify_ref";
const CLAIM_ATTEMPTED_FLAG = "quizmify:referral-claim-attempted";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/**
 * Two jobs, both silent/best-effort, mounted once in the root layout:
 *
 * 1. If the current URL has ?ref=<userId> (someone followed a referral
 *    link), stash it in a short-lived cookie -- needed because Google
 *    OAuth's redirect round-trip would otherwise lose a query param that
 *    only lived on this page load.
 * 2. If that cookie is present, ask the server to claim it. The server is
 *    the one that decides whether this is a genuinely fresh signup (see
 *    /api/referrals/claim) -- this component doesn't know or care whether
 *    the user was already registered.
 *
 * This component lives in the root layout, which Next.js does NOT remount
 * on client-side navigation (e.g. the login form's router.push after
 * sign-in) -- only on a full page load. A plain `useEffect(fn, [])` would
 * therefore only ever get one shot at the claim, typically while the user
 * is still logged out. Depending on `pathname` instead re-runs the check on
 * every route change until it actually succeeds (or the cookie's gone).
 */
export default function ReferralCapture() {
  const pathname = usePathname();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(ref)}; Max-Age=86400; Path=/; SameSite=Lax`;
    }
  }, []);

  React.useEffect(() => {
    if (sessionStorage.getItem(CLAIM_ATTEMPTED_FLAG)) return;

    const referrerId = getCookie(COOKIE_NAME);
    if (!referrerId) return;

    fetch("/api/referrals/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));

        // Not logged in yet (e.g. this fired on the /register page itself,
        // before the account exists) -- leave the cookie and the flag alone
        // so a later, authenticated page load retries instead of this
        // premature attempt permanently swallowing the claim.
        if (data?.reason === "unauthenticated") return;

        sessionStorage.setItem(CLAIM_ATTEMPTED_FLAG, "1");
        clearCookie(COOKIE_NAME);
      })
      .catch(() => {
        /* network hiccup -- leave everything alone, retry on next page */
      });
  }, [pathname]);

  return null;
}
