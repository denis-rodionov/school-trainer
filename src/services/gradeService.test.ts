jest.mock('../services/firebase', () => ({
  auth: {},
  db: {},
  default: {},
}));

jest.mock('./users', () => {
  const actual = jest.requireActual<typeof import('./users')>('./users');
  return {
    ...actual,
    getSubjectData: jest.fn(),
    updateSubjectGradeAndGutscheins: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('./worksheets', () => ({
  getCompletedWorksheetsBySubject: jest.fn(),
}));

import { Timestamp } from 'firebase/firestore';
import { isGradeStale, calculateAndUpdateGrade } from './gradeService';
import { getSubjectData, updateSubjectGradeAndGutscheins } from './users';
import { getCompletedWorksheetsBySubject } from './worksheets';
import { SubjectData } from '../types';

const mockGetSubjectData = getSubjectData as jest.MockedFunction<typeof getSubjectData>;
const mockUpdateSubjectGradeAndGutscheins =
  updateSubjectGradeAndGutscheins as jest.MockedFunction<typeof updateSubjectGradeAndGutscheins>;
const mockGetCompletedWorksheetsBySubject =
  getCompletedWorksheetsBySubject as jest.MockedFunction<typeof getCompletedWorksheetsBySubject>;

const studentId = 'student-1';
const subject = 'math';

function subjectWithGradeAndPasses(
  grade: number,
  balance: number,
  defaultWeekly = 1
): SubjectData {
  return {
    subject,
    topicAssignments: [{ topicId: 't1', count: 3 }],
    statistics: {
      worksheetsLast7Days: 0,
      grade,
      gradeUpdatedDate: Timestamp.fromDate(new Date('2026-06-28T10:00:00')),
    },
    gutscheins: { balance, defaultWeekly },
  };
}

describe('gradeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isGradeStale', () => {
    it('returns true when grade is undefined', () => {
      expect(isGradeStale(undefined, Timestamp.now())).toBe(true);
    });

    it('returns true when gradeUpdatedDate is undefined', () => {
      expect(isGradeStale(3, undefined)).toBe(true);
    });

    it('returns false when grade was updated today', () => {
      expect(isGradeStale(3, Timestamp.now())).toBe(false);
    });

    it('returns true when grade was updated yesterday', () => {
      const yesterday = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
      expect(isGradeStale(3, yesterday)).toBe(true);
    });
  });

  describe('calculateAndUpdateGrade', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-29T10:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('spends a pass to keep the grade when raw grade would worsen', async () => {
      mockGetSubjectData.mockResolvedValue(subjectWithGradeAndPasses(2, 1));
      mockGetCompletedWorksheetsBySubject.mockResolvedValue([
        {
          id: 'w1',
          studentId,
          subject,
          status: 'completed',
          createdAt: Timestamp.fromDate(new Date('2026-06-27T10:00:00')),
          completedAt: Timestamp.fromDate(new Date('2026-06-27T10:00:00')),
        },
      ]);

      await expect(calculateAndUpdateGrade(studentId, subject)).resolves.toBe(2);

      expect(mockUpdateSubjectGradeAndGutscheins).toHaveBeenCalledWith(
        studentId,
        subject,
        2,
        expect.any(Timestamp),
        {
          balance: 0,
          defaultWeekly: 1,
        }
      );
    });

    it('does not spend passes when raw grade improves', async () => {
      mockGetSubjectData.mockResolvedValue(subjectWithGradeAndPasses(4, 2));
      mockGetCompletedWorksheetsBySubject.mockResolvedValue([
        {
          id: 'w1',
          studentId,
          subject,
          status: 'completed',
          createdAt: Timestamp.fromDate(new Date('2026-06-29T09:00:00')),
          completedAt: Timestamp.fromDate(new Date('2026-06-29T09:00:00')),
        },
      ]);

      await expect(calculateAndUpdateGrade(studentId, subject)).resolves.toBe(1);

      expect(mockUpdateSubjectGradeAndGutscheins).toHaveBeenCalledWith(
        studentId,
        subject,
        1,
        expect.any(Timestamp),
        {
          balance: 2,
          defaultWeekly: 1,
        }
      );
    });

    it('downgrades fully when no passes remain', async () => {
      mockGetSubjectData.mockResolvedValue(subjectWithGradeAndPasses(2, 0));
      mockGetCompletedWorksheetsBySubject.mockResolvedValue([
        {
          id: 'w1',
          studentId,
          subject,
          status: 'completed',
          createdAt: Timestamp.fromDate(new Date('2026-06-27T10:00:00')),
          completedAt: Timestamp.fromDate(new Date('2026-06-27T10:00:00')),
        },
      ]);

      await expect(calculateAndUpdateGrade(studentId, subject)).resolves.toBe(3);

      expect(mockUpdateSubjectGradeAndGutscheins).toHaveBeenCalledWith(
        studentId,
        subject,
        3,
        expect.any(Timestamp),
        {
          balance: 0,
          defaultWeekly: 1,
        }
      );
    });
  });
});
