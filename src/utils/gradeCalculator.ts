/**
 * Pure grade calculation (1–6) from worksheet completion stats.
 * Returns null when no worksheets have been completed.
 */
export function computeGrade(
  completedCount: number,
  countLast7Days: number,
  daysSinceLast: number
): number | null {
  if (completedCount === 0) {
    return null;
  }

  if (completedCount < 6) {
    return Math.min(6, Math.max(1, 1 + daysSinceLast));
  }

  return Math.min(6, Math.max(1, 7 - countLast7Days));
}
