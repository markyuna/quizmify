/**
 * XP progression curve optimized for conversion:
 * - Levels 1-2: Easy progression to get users invested
 * - Level 3+: Hard paywall for Free users (blocks at L2)
 * - Pro users: Unlimited progression
 */

export const XP_CURVE = {
  1: 100,    // L1 → L2: 100 XP
  2: 150,    // L2 → L3: 150 XP
  3: 400,    // L3 → L4: 400 XP (2.6x jump — paywall trigger)
  4: 500,    // L4 → L5: 500 XP
  5: 600,    // L5 → L6: 600 XP
  6: 700,    // L6+ → L7+: 700 XP (continues at 700)
} as const;

/**
 * Max level for free users. Attempting to reach level 3 triggers
 * the paywall upgrade modal.
 */
export const FREE_USER_MAX_LEVEL = 2;

/**
 * XP required to advance from current level to next.
 * For levels > 6, always returns 700.
 */
export function xpRequiredForLevel(level: number): number {
  if (level < 1 || level > 6) return XP_CURVE[6] || 700;
  return XP_CURVE[level as keyof typeof XP_CURVE];
}

/**
 * Cumulative XP needed to *reach* the start of a level.
 * E.g., to reach L2, need cumulativeXpForLevel(2) = 100 XP.
 * To reach L3, need 100 + 150 = 250 XP.
 */
export function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;

  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpRequiredForLevel(i);
  }
  return total;
}

/**
 * Calculate the level a user is at based on total XP.
 * Finds the highest level where cumulativeXpForLevel(level) <= totalXp.
 */
export function calculateLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;

  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

/**
 * Progress towards the next level.
 */
export function getLevelProgress(totalXp: number) {
  const currentLevel = calculateLevel(totalXp);
  const xpPerLevel = xpRequiredForLevel(currentLevel);
  const xpIntoCurrentLevel = totalXp - cumulativeXpForLevel(currentLevel);
  const xpToNextLevel = xpPerLevel - xpIntoCurrentLevel;

  return {
    currentLevel,
    xpIntoCurrentLevel,
    xpPerLevel,
    xpToNextLevel,
    progressPercent: (xpIntoCurrentLevel / xpPerLevel) * 100,
  };
}

/**
 * Check if a user can advance to the next level based on their pro status.
 * Free users are capped at level 2. Pro users have no limit.
 */
export function canAdvanceToLevel(nextLevel: number, isPro: boolean): boolean {
  if (isPro) return true;
  return nextLevel <= FREE_USER_MAX_LEVEL;
}

/**
 * Check if this is the paywall trigger point:
 * User is Free AND trying to reach level 3.
 */
export function isPaywallTrigger(nextLevel: number, isPro: boolean): boolean {
  if (isPro) return false;
  return nextLevel === FREE_USER_MAX_LEVEL + 1;
}
