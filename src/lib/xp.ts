export function calculateEarnedXpBreakdown({
  correctAnswers,
  totalQuestions,
}: {
  correctAnswers: number;
  totalQuestions: number;
}) {
  // No completion reward for a 0-correct run -- previously flat/
  // unconditional, which let a quiz (or a guest daily game's single
  // question, via computeGuestXp in guestPlay.ts) with zero right answers
  // still earn 10 XP. Applies everywhere this function is used, on
  // purpose: failing/abandoning shouldn't pay out just for showing up.
  const completionXp = correctAnswers > 0 ? 10 : 0;
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

// Re-export from the optimized progression curve module
export {
  xpRequiredForLevel,
  cumulativeXpForLevel,
  calculateLevel,
  getLevelProgress,
  canAdvanceToLevel,
  isPaywallTrigger,
  FREE_USER_MAX_LEVEL,
} from "./xpProgression";
