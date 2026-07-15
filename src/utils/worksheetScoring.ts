/** Percentage deducted from the worksheet score for each mistake on every check. */
export const MISTAKE_SCORE_PENALTY_PERCENT = 5;

/**
 * Compute worksheet score percentage from correct and total exercise counts.
 * Used for trainer review where each exercise is marked correct or incorrect.
 */
export function computeWorksheetScore(correctCount: number, totalExercises: number): number {
  return totalExercises > 0 ? (correctCount / totalExercises) * 100 : 100;
}

/**
 * Compute worksheet score from cumulative mistakes across checks,
 * deducting a fixed percent per mistake.
 */
export function computeWorksheetScoreFromMistakes(
  mistakeCount: number,
  penaltyPercent: number = MISTAKE_SCORE_PENALTY_PERCENT
): number {
  return Math.max(0, 100 - mistakeCount * penaltyPercent);
}
