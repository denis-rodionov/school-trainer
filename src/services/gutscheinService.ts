import { getSubjectData, updateSubjectGutscheins, normalizeGutscheins } from './users';
import { getCompletedWorksheetsBySubject } from './worksheets';
import {
  applyWeeklyRefill,
  hasWorksheetCompletedInLast7Days,
} from '../utils/gutscheinCalculator';
import { Subject } from '../types';

export const processWeeklyRefillIfNeeded = async (
  studentId: string,
  subject: Subject
): Promise<boolean> => {
  const subjectData = await getSubjectData(studentId, subject);
  if (!subjectData) {
    return false;
  }

  const now = new Date();
  const completedWorksheets = await getCompletedWorksheetsBySubject(studentId, subject, 50);
  if (!hasWorksheetCompletedInLast7Days(completedWorksheets, now)) {
    return false;
  }

  const gutscheins = normalizeGutscheins(subjectData.gutscheins);
  const refill = applyWeeklyRefill(
    gutscheins.balance,
    gutscheins.defaultWeekly,
    gutscheins.lastWeeklyRefillWeek,
    now
  );

  if (
    refill.balance === gutscheins.balance &&
    refill.lastWeeklyRefillWeek === gutscheins.lastWeeklyRefillWeek
  ) {
    return false;
  }

  await updateSubjectGutscheins(studentId, subject, {
    ...gutscheins,
    balance: refill.balance,
    lastWeeklyRefillWeek: refill.lastWeeklyRefillWeek,
  });
  return true;
};

export const addBonusGutscheins = async (
  studentId: string,
  subject: Subject,
  amount: number
): Promise<void> => {
  if (amount <= 0) {
    return;
  }

  const subjectData = await getSubjectData(studentId, subject);
  if (!subjectData) {
    throw new Error('Subject data not found');
  }

  const gutscheins = normalizeGutscheins(subjectData.gutscheins);
  await updateSubjectGutscheins(studentId, subject, {
    ...gutscheins,
    balance: gutscheins.balance + amount,
  });
};

export const setDefaultWeeklyGutscheins = async (
  studentId: string,
  subject: Subject,
  defaultWeekly: number
): Promise<void> => {
  const subjectData = await getSubjectData(studentId, subject);
  if (!subjectData) {
    throw new Error('Subject data not found');
  }

  const gutscheins = normalizeGutscheins(subjectData.gutscheins);
  await updateSubjectGutscheins(studentId, subject, {
    ...gutscheins,
    defaultWeekly: Math.max(0, defaultWeekly),
  });
};
