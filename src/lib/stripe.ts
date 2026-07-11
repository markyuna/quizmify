import Stripe from "stripe";

import { cumulativeXpForLevel } from "@/lib/xp";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-06-24.dahlia",
    });
  }
  return _stripe;
}

export const FREE_LEVEL_CAP = 2;
// XP needed to reach the level *after* the cap -- i.e. the ceiling free
// users bump into. Derived from the same curve as display/level-up logic
// (src/lib/xp.ts) so the paywall and the UI never disagree about costs.
export const FREE_XP_CAP = cumulativeXpForLevel(FREE_LEVEL_CAP + 1);
