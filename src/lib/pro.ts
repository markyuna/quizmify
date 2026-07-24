import { isEffectivelyPro } from "@/lib/paywall";
import { FREE_LEVEL_CAP } from "@/lib/stripe";
import { calculateLevel } from "@/lib/xp";

/**
 * Level freezing for lapsed Pro users.
 *
 * The rule: XP is *never* destroyed. A user's stored `xp` always reflects
 * everything they've earned, so `calculateLevel(xp)` is their true level
 * forever. What Pro status gates is the *effective* level -- the one we
 * display, award trophies against, and let them progress with.
 *
 * So a user who reached level 5 during a referral window and then lapsed
 * shows as level 2, keeps level 5 in the database, and pops straight back
 * to level 5 the moment they're Pro again. No migration, no restore step,
 * no second source of truth: it falls out of deriving the cap at read time
 * instead of writing a clamped value.
 *
 * This deliberately re-exports isEffectivelyPro rather than defining
 * another Pro check -- src/lib/paywall.ts stays the single source of truth
 * for "is this user Pro", including real subscriptions, referral rewards,
 * and the free trial.
 */
export { isEffectivelyPro } from "@/lib/paywall";

type ProGateUser = {
  subscriptionStatus: string;
  premiumUntil: Date | null;
};

type LevelGateUser = ProGateUser & {
  xp: number;
};

/**
 * The user's true level from their lifetime XP, ignoring Pro status. This
 * is what stays preserved across a lapse -- read `xp`, not the stored
 * `level` column, since `level` holds the capped value for free users.
 */
export function getFrozenLevel(user: LevelGateUser): number {
  return calculateLevel(user.xp);
}

/**
 * The level the user actually gets to use right now: their true level if
 * Pro, otherwise capped at FREE_LEVEL_CAP.
 */
export function getEffectiveLevel(user: LevelGateUser, now: Date = new Date()): number {
  const trueLevel = getFrozenLevel(user);
  if (isEffectivelyPro(user, now)) return trueLevel;
  return Math.min(trueLevel, FREE_LEVEL_CAP);
}

/**
 * True when the user has earned past the free cap but isn't currently Pro
 * -- i.e. there's real progress sitting frozen behind the paywall. Drives
 * the "your level N is saved" messaging; distinct from simply being at the
 * cap, which is the ordinary free-tier state and not worth a banner.
 */
export function isLevelFrozen(user: LevelGateUser, now: Date = new Date()): boolean {
  if (isEffectivelyPro(user, now)) return false;
  return getFrozenLevel(user) > FREE_LEVEL_CAP;
}

/**
 * Whole days until temporary Pro access lapses, for the dashboard's
 * "expires in N days" note. Null when the user has no time-limited grant
 * (a real paid subscription never counts down). Rounds up so the last
 * partial day still reads as "1 day", never "0".
 */
export function getProDaysRemaining(
  user: ProGateUser,
  now: Date = new Date()
): number | null {
  if (user.subscriptionStatus === "pro") return null;
  if (!user.premiumUntil || user.premiumUntil <= now) return null;

  return Math.ceil((user.premiumUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
