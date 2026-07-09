jest.mock('./users', () => {
  const actual = jest.requireActual<typeof import('./users')>('./users');
  return {
    ...actual,
    getSubjectData: jest.fn(),
    updateSubjectGutscheins: jest.fn().mockResolvedValue(undefined),
  };
});

import { getSubjectData, updateSubjectGutscheins } from './users';
import {
  addBonusGutscheins,
  processWeeklyRefillIfNeeded,
  setDefaultWeeklyGutscheins,
} from './gutscheinService';
import { SubjectData } from '../types';

const mockGetSubjectData = getSubjectData as jest.MockedFunction<typeof getSubjectData>;
const mockUpdateSubjectGutscheins = updateSubjectGutscheins as jest.MockedFunction<
  typeof updateSubjectGutscheins
>;

const studentId = 'student-1';
const subject = 'math';

function subjectWithGutscheins(
  gutscheins: SubjectData['gutscheins']
): SubjectData {
  return {
    subject,
    topicAssignments: [{ topicId: 't1', count: 3 }],
    statistics: { worksheetsLast7Days: 0 },
    gutscheins,
  };
}

describe('gutscheinService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-29T10:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('processWeeklyRefillIfNeeded', () => {
    it('returns false when subject data is missing', async () => {
      mockGetSubjectData.mockResolvedValue(null);

      await expect(processWeeklyRefillIfNeeded(studentId, subject)).resolves.toBe(false);
      expect(mockUpdateSubjectGutscheins).not.toHaveBeenCalled();
    });

    it('adds default weekly passes when entering a new ISO week', async () => {
      mockGetSubjectData.mockResolvedValue(
        subjectWithGutscheins({
          balance: 2,
          defaultWeekly: 1,
          lastWeeklyRefillWeek: '2026-W26',
        })
      );

      await expect(processWeeklyRefillIfNeeded(studentId, subject)).resolves.toBe(true);
      expect(mockUpdateSubjectGutscheins).toHaveBeenCalledWith(studentId, subject, {
        balance: 3,
        defaultWeekly: 1,
        lastWeeklyRefillWeek: '2026-W27',
      });
    });

    it('refills on first visit when lastWeeklyRefillWeek is unset', async () => {
      mockGetSubjectData.mockResolvedValue(
        subjectWithGutscheins({ balance: 0, defaultWeekly: 2 })
      );

      await expect(processWeeklyRefillIfNeeded(studentId, subject)).resolves.toBe(true);
      expect(mockUpdateSubjectGutscheins).toHaveBeenCalledWith(studentId, subject, {
        balance: 2,
        defaultWeekly: 2,
        lastWeeklyRefillWeek: '2026-W27',
      });
    });

    it('does not refill twice in the same week', async () => {
      mockGetSubjectData.mockResolvedValue(
        subjectWithGutscheins({
          balance: 3,
          defaultWeekly: 1,
          lastWeeklyRefillWeek: '2026-W27',
        })
      );

      await expect(processWeeklyRefillIfNeeded(studentId, subject)).resolves.toBe(false);
      expect(mockUpdateSubjectGutscheins).not.toHaveBeenCalled();
    });

    it('does not change balance when default weekly is zero', async () => {
      mockGetSubjectData.mockResolvedValue(
        subjectWithGutscheins({
          balance: 4,
          defaultWeekly: 0,
          lastWeeklyRefillWeek: '2026-W26',
        })
      );

      await expect(processWeeklyRefillIfNeeded(studentId, subject)).resolves.toBe(true);
      expect(mockUpdateSubjectGutscheins).toHaveBeenCalledWith(studentId, subject, {
        balance: 4,
        defaultWeekly: 0,
        lastWeeklyRefillWeek: '2026-W27',
      });
    });
  });

  describe('addBonusGutscheins', () => {
    it('adds bonus passes to the current balance', async () => {
      mockGetSubjectData.mockResolvedValue(
        subjectWithGutscheins({ balance: 1, defaultWeekly: 1 })
      );

      await addBonusGutscheins(studentId, subject, 2);

      expect(mockUpdateSubjectGutscheins).toHaveBeenCalledWith(studentId, subject, {
        balance: 3,
        defaultWeekly: 1,
      });
    });

    it('ignores non-positive bonus amounts', async () => {
      mockGetSubjectData.mockResolvedValue(
        subjectWithGutscheins({ balance: 1, defaultWeekly: 1 })
      );

      await addBonusGutscheins(studentId, subject, 0);

      expect(mockUpdateSubjectGutscheins).not.toHaveBeenCalled();
    });

    it('throws when subject data is missing', async () => {
      mockGetSubjectData.mockResolvedValue(null);

      await expect(addBonusGutscheins(studentId, subject, 1)).rejects.toThrow(
        'Subject data not found'
      );
    });
  });

  describe('setDefaultWeeklyGutscheins', () => {
    it('persists the trainer-configured weekly allowance', async () => {
      mockGetSubjectData.mockResolvedValue(
        subjectWithGutscheins({ balance: 2, defaultWeekly: 0 })
      );

      await setDefaultWeeklyGutscheins(studentId, subject, 3);

      expect(mockUpdateSubjectGutscheins).toHaveBeenCalledWith(studentId, subject, {
        balance: 2,
        defaultWeekly: 3,
      });
    });

    it('clamps negative values to zero', async () => {
      mockGetSubjectData.mockResolvedValue(
        subjectWithGutscheins({ balance: 1, defaultWeekly: 2 })
      );

      await setDefaultWeeklyGutscheins(studentId, subject, -5);

      expect(mockUpdateSubjectGutscheins).toHaveBeenCalledWith(studentId, subject, {
        balance: 1,
        defaultWeekly: 0,
      });
    });

    it('throws when subject data is missing', async () => {
      mockGetSubjectData.mockResolvedValue(null);

      await expect(setDefaultWeeklyGutscheins(studentId, subject, 1)).rejects.toThrow(
        'Subject data not found'
      );
    });
  });
});
