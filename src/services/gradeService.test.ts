jest.mock('../services/firebase', () => ({
  auth: {},
  db: {},
  default: {},
}));

import { Timestamp } from 'firebase/firestore';
import { isGradeStale } from '../services/gradeService';

describe('gradeService', () => {
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
});
