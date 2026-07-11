export function calculateEarnedXpBreakdown({
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

  return {
    completionXp,
    correctAnswersXp,
    perfectScoreBonus,
    totalXp: completionXp + correctAnswersXp + perfectScoreBonus,
  };
}

export function calculateEarnedXp(params: {
  correctAnswers: number;
  totalQuestions: number;
}) {
  return calculateEarnedXpBreakdown(params).totalXp;
}

/** Flat bonus for beating the day's average score on the daily challenge. */
const DAILY_CHALLENGE_ABOVE_AVERAGE_BONUS_XP = 15;

/**
 * XP for a daily challenge attempt: the same completion/correctness/perfect
 * formula as a regular quiz (`calculateEarnedXpBreakdown`), plus a flat bonus
 * for beating the day's average. The average must be passed in as a snapshot
 * taken *before* this attempt is recorded -- comparing against a value that
 * keeps moving as more people play would let the bonus flicker for a result
 * that's already been paid out. `participantCountBeforeAttempt` guards the
 * bonus so the very first player of the day (average of 0) can't trivially
 * "beat" an empty leaderboard.
 */
export function calculateDailyChallengeXp({
  correctAnswers,
  totalQuestions,
  score,
  averageScoreBeforeAttempt,
  participantCountBeforeAttempt,
}: {
  correctAnswers: number;
  totalQuestions: number;
  score: number;
  averageScoreBeforeAttempt: number;
  participantCountBeforeAttempt: number;
}) {
  const { totalXp: baseXp } = calculateEarnedXpBreakdown({ correctAnswers, totalQuestions });

  const aboveAverageBonusXp =
    participantCountBeforeAttempt > 0 && score > averageScoreBeforeAttempt
      ? DAILY_CHALLENGE_ABOVE_AVERAGE_BONUS_XP
      : 0;

  return {
    baseXp,
    aboveAverageBonusXp,
    totalXp: baseXp + aboveAverageBonusXp,
  };
}

/** Timed-mode speed bonus, in XP, awarded per correct answer. */
const TIMED_MODE_MAX_SPEED_BONUS_PER_QUESTION = 10;

/**
 * Rewards fast correct answers in timed-mode quizzes: answering instantly
 * earns the full per-question bonus, answering right at the limit earns
 * none, linear in between. Wrong answers and answers with no recorded
 * response time never earn a bonus.
 */
export function calculateSpeedBonusXp({
  answers,
  timeLimitMs,
}: {
  answers: Array<{ isCorrect: boolean; responseTimeMs: number | null | undefined }>;
  timeLimitMs: number;
}): number {
  if (timeLimitMs <= 0) return 0;

  return answers.reduce((total, answer) => {
    if (!answer.isCorrect || answer.responseTimeMs == null) return total;

    const speedFraction = Math.max(0, Math.min(1, 1 - answer.responseTimeMs / timeLimitMs));
    return total + Math.round(TIMED_MODE_MAX_SPEED_BONUS_PER_QUESTION * speedFraction);
  }, 0);
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
