import { getISOWeek, getISOWeekYear } from 'date-fns';
import { SubjectGutscheins } from '../types';

export interface GutscheinGradeResult {
  adjustedGrade: number | null;
  spent: number;
}

export interface WeeklyRefillResult {
  balance: number;
  lastWeeklyRefillWeek: string;
}

/**
 * ISO week key for Monday-start weeks, e.g. "2026-W26".
 */
export function getIsoWeekKey(date: Date): string {
  const year = getISOWeekYear(date);
  const week = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * True when the current week is later than the last refill week.
 */
export function needsWeeklyRefill(lastRefillWeek: string | undefined, now: Date): boolean {
  if (!lastRefillWeek) {
    return true;
  }
  return getIsoWeekKey(now) !== lastRefillWeek;
}

/**
 * Add default weekly Gutscheins when entering a new calendar week.
 */
export function applyWeeklyRefill(
  balance: number,
  defaultWeekly: number,
  lastRefillWeek: string | undefined,
  now: Date
): WeeklyRefillResult {
  const currentWeek = getIsoWeekKey(now);
  if (!needsWeeklyRefill(lastRefillWeek, now)) {
    return {
      balance,
      lastWeeklyRefillWeek: lastRefillWeek ?? currentWeek,
    };
  }

  return {
    balance: balance + defaultWeekly,
    lastWeeklyRefillWeek: currentWeek,
  };
}

/**
 * Spend Gutscheins to soften a grade downgrade.
 * One Gutschein covers one grade step (higher number = worse).
 */
export function applyGutscheinsToGrade(
  rawGrade: number | null,
  currentGrade: number | undefined | null,
  balance: number
): GutscheinGradeResult {
  if (rawGrade === null) {
    return { adjustedGrade: null, spent: 0 };
  }

  if (currentGrade === undefined || currentGrade === null) {
    return { adjustedGrade: rawGrade, spent: 0 };
  }

  if (rawGrade <= currentGrade) {
    return { adjustedGrade: rawGrade, spent: 0 };
  }

  const stepsToCover = rawGrade - currentGrade;
  const spent = Math.min(stepsToCover, Math.max(0, balance));
  return {
    adjustedGrade: rawGrade - spent,
    spent,
  };
}

/** Firestore rejects undefined field values — omit optional fields when unset. */
export function gutscheinsForFirestore(gutscheins: SubjectGutscheins): Record<string, number | string> {
  const data: Record<string, number | string> = {
    balance: gutscheins.balance,
    defaultWeekly: gutscheins.defaultWeekly,
  };
  if (gutscheins.lastWeeklyRefillWeek !== undefined) {
    data.lastWeeklyRefillWeek = gutscheins.lastWeeklyRefillWeek;
  }
  return data;
}
