import { cookies } from "next/headers";

import { isValidGuestId } from "@/lib/guestPlay";

// Set client-side by useGuestId() in useGuestRound.ts -- same cookie used by
// the 3 guest mini-games, now reused for a guest-played quiz so both flows
// (and /api/guest/claim-quiz below) recognize the same visitor.
export const GUEST_ID_COOKIE = "quizmify_guest";

/** Reads and validates the guest id from the cookie on the server; null if absent/malformed. */
export async function getGuestIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(GUEST_ID_COOKIE)?.value;
  return isValidGuestId(value) ? value : null;
}
