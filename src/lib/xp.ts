export function calculateEarnedXp({
  correctAnswers,
  totalQuestions,
}: {
  correctAnswers: number;
  totalQuestions: number;
}) {
  const completionXp = 10;
  const correctAnswersXp = correctAnswers * 5;
  const perfectScoreBonus =
    totalQuestions > 0 && correctAnswers === totalQuestions ? 20 : 0;

  return completionXp + correctAnswersXp + perfectScoreBonus;
}

// Levels get progressively more expensive: clearing level N costs
// XP_PER_LEVEL_BASE * N XP (level 1->2 costs 100, 2->3 costs 200, 3->4 costs
// 300, ...), instead of a flat 100 XP per level. Keeps early levels feeling
// the same while later ones take real, sustained play to reach.
const XP_PER_LEVEL_BASE = 100;

/** XP required to clear `level` and reach `level + 1`. */
export function xpRequiredForLevel(level: number): number {
  return XP_PER_LEVEL_BASE * level;
}

/** Total cumulative XP needed to *reach* the start of `level`. */
export function cumulativeXpForLevel(level: number): number {
  const n = level - 1;
  return (XP_PER_LEVEL_BASE * n * (n + 1)) / 2;
}

export function calculateLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;

  // Closed-form estimate (inverse of the triangular-number cumulative XP
  // formula), then nudged to the exact boundary to cover floating-point
  // rounding right at a level threshold.
  let level = Math.max(
    1,
    Math.floor((1 + Math.sqrt(1 + (8 * totalXp) / XP_PER_LEVEL_BASE)) / 2)
  );

  while (cumulativeXpForLevel(level + 1) <= totalXp) level++;
  while (level > 1 && cumulativeXpForLevel(level) > totalXp) level--;

  return level;
}

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
