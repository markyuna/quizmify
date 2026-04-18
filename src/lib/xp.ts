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
  
  export function calculateLevel(totalXp: number) {
    return Math.floor(totalXp / 100) + 1;
  }
  
  export function getLevelProgress(totalXp: number) {
    const xpPerLevel = 100;
    const currentLevel = calculateLevel(totalXp);
    const xpIntoCurrentLevel = totalXp % xpPerLevel;
    const xpToNextLevel = xpPerLevel - xpIntoCurrentLevel;
  
    return {
      currentLevel,
      xpIntoCurrentLevel,
      xpPerLevel,
      xpToNextLevel: xpIntoCurrentLevel === 0 ? xpPerLevel : xpToNextLevel,
      progressPercent: (xpIntoCurrentLevel / xpPerLevel) * 100,
    };
  }