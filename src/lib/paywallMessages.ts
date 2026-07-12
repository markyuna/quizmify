/**
 * Data-driven paywall messaging: which message a user sees when they hit
 * the free-tier cap depends on their own usage, and is picked from this
 * table rather than hardcoded in the banner components. To A/B test a new
 * message, add a variant here (and its translation keys) -- no component
 * changes needed. `messageKey` points into messages/*.json under the
 * "Paywall" namespace.
 */
export type PaywallMessageContext = {
  quizzesPlayed: number;
  currentStreak: number;
  usedFreeTrial: boolean;
  usedStreakProtection: boolean;
};

export type PaywallMessageVariant = {
  id: string;
  /** Higher wins when multiple variants match the same context. */
  priority: number;
  matches: (ctx: PaywallMessageContext) => boolean;
  messageKey: string;
  values: (ctx: PaywallMessageContext) => Record<string, string | number>;
};

export const PAYWALL_MESSAGE_VARIANTS: PaywallMessageVariant[] = [
  // Tried the trial and actually leaned on a Pro perk (streak protection)
  // -- name the thing they'd lose, not a generic pitch.
  {
    id: "trial_streak_protection",
    priority: 30,
    matches: (ctx) => ctx.usedFreeTrial && ctx.usedStreakProtection,
    messageKey: "Paywall.messageStreakProtection",
    values: () => ({}),
  },
  // Tried the trial but that specific signal isn't there -- still reference
  // the trial itself rather than a cold pitch.
  {
    id: "trial_used_generic",
    priority: 20,
    matches: (ctx) => ctx.usedFreeTrial,
    messageKey: "Paywall.messageTrialUsed",
    values: () => ({}),
  },
  // Never tried the trial, but has a real streak going -- protection is the
  // most concrete, loss-averse hook available.
  {
    id: "high_streak",
    priority: 15,
    matches: (ctx) => !ctx.usedFreeTrial && ctx.currentStreak >= 5,
    messageKey: "Paywall.messageStreak",
    values: (ctx) => ({ streak: ctx.currentStreak }),
  },
  // Engaged enough to have a real count worth citing.
  {
    id: "quiz_count",
    priority: 10,
    matches: (ctx) => ctx.quizzesPlayed >= 5,
    messageKey: "Paywall.messageQuizCount",
    values: (ctx) => ({ count: ctx.quizzesPlayed }),
  },
  // Always matches -- the floor every other variant is compared against.
  {
    id: "default",
    priority: 0,
    matches: () => true,
    messageKey: "Paywall.messageDefault",
    values: () => ({}),
  },
];

export function resolvePaywallMessage(ctx: PaywallMessageContext): PaywallMessageVariant {
  let best = PAYWALL_MESSAGE_VARIANTS[PAYWALL_MESSAGE_VARIANTS.length - 1];

  for (const variant of PAYWALL_MESSAGE_VARIANTS) {
    if (variant.matches(ctx) && variant.priority > best.priority) {
      best = variant;
    }
  }

  return best;
}
