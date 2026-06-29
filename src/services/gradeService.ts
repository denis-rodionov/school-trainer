/**
 * Grade Service
 * 
 * Calculates and updates subject grades (1-6) based on worksheet completion patterns.
 * Grade calculation rules:
 * - No worksheets: null (no grade)
 * - < 6 total completed: grade based on days since last completion (0 days = 1, 1 day = 2, ..., 5+ days = 6)
 * - 6+ total completed: grade based on count in last 7 days (6 worksheets = 1, 0 worksheets = 6, linear interpolation)
 */

import { Timestamp } from 'firebase/firestore';
import { differenceInDays, isToday } from 'date-fns';
import { getCompletedWorksheetsBySubject } from './worksheets';
import { updateSubjectGrade } from './users';
import { isWithinLastDays } from '../utils/dateUtils';
import { computeGrade } from '../utils/gradeCalculator';
import { Subject } from '../types';

/**
 * Calculate grade for a subject based on worksheet completion patterns
 * 
 * @param studentId - Student user ID
 * @param subject - Subject name
 * @returns Grade (1-6) or null if no worksheets completed
 */
export const calculateGrade = async (
  studentId: string,
  subject: Subject
): Promise<number | null> => {
  // Get all completed worksheets for this subject
  const completedWorksheets = await getCompletedWorksheetsBySubject(studentId, subject, 50);
  
  // No worksheets completed - no grade
  if (completedWorksheets.length === 0) {
    return null;
  }
  
  // Get most recent completion date
  const mostRecent = completedWorksheets[0];
  if (!mostRecent.completedAt) {
    return null;
  }
  
  // Convert Timestamp to Date
  let mostRecentDate: Date;
  if (mostRecent.completedAt && typeof mostRecent.completedAt.toDate === 'function') {
    mostRecentDate = mostRecent.completedAt.toDate();
  } else if (mostRecent.completedAt && typeof mostRecent.completedAt === 'object' && 'seconds' in mostRecent.completedAt) {
    // Firestore Timestamp with seconds property
    const ts = mostRecent.completedAt as any;
    mostRecentDate = new Date(ts.seconds * 1000);
  } else {
    mostRecentDate = new Date(mostRecent.completedAt as any);
  }
  
  // Count worksheets completed in last 7 days
  const last7Days = completedWorksheets.filter((w) => {
    if (!w.completedAt) return false;
    return isWithinLastDays(w.completedAt, 7);
  });
  const countLast7Days = last7Days.length;
  const daysSinceLast = differenceInDays(new Date(), mostRecentDate);

  return computeGrade(completedWorksheets.length, countLast7Days, daysSinceLast);
};

/**
 * Calculate and persist grade for a subject
 * 
 * @param studentId - Student user ID
 * @param subject - Subject name
 * @returns Grade (1-6) or null if no worksheets completed
 */
export const calculateAndUpdateGrade = async (
  studentId: string,
  subject: Subject
): Promise<number | null> => {
  const grade = await calculateGrade(studentId, subject);
  const gradeUpdatedDate = Timestamp.now();
  
  // Persist grade (even if null, to mark that we've checked)
  await updateSubjectGrade(studentId, subject, grade, gradeUpdatedDate);
  
  return grade;
};

/**
 * Check if grade needs to be recalculated
 * Grade is stale if:
 * - grade is missing
 * - gradeUpdatedDate is missing
 * - gradeUpdatedDate is not today (to ensure "last 7 days" count is fresh)
 * 
 * @param grade - Current grade (may be undefined)
 * @param gradeUpdatedDate - Current gradeUpdatedDate (may be undefined)
 * @returns true if grade should be recalculated
 */
export const isGradeStale = (
  grade: number | undefined,
  gradeUpdatedDate: Timestamp | undefined
): boolean => {
  if (grade === undefined || !gradeUpdatedDate) {
    return true;
  }
  
  // Convert Timestamp to Date
  let updateDate: Date;
  if (gradeUpdatedDate && typeof gradeUpdatedDate.toDate === 'function') {
    updateDate = gradeUpdatedDate.toDate();
  } else if (gradeUpdatedDate && typeof gradeUpdatedDate === 'object' && 'seconds' in gradeUpdatedDate) {
    const ts = gradeUpdatedDate as any;
    updateDate = new Date(ts.seconds * 1000);
  } else {
    updateDate = new Date(gradeUpdatedDate as any);
  }
  return !isToday(updateDate);
};
