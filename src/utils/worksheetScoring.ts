/**
 * Compute worksheet score percentage from correct and total exercise counts.
 */
export function computeWorksheetScore(correctCount: number, totalExercises: number): number {
  return totalExercises > 0 ? (correctCount / totalExercises) * 100 : 100;
}
