import { computeGrade } from './gradeCalculator';

describe('gradeCalculator', () => {
  describe('computeGrade', () => {
    it('returns null when no worksheets completed', () => {
      expect(computeGrade(0, 0, 0)).toBeNull();
    });

    describe('just began (< 6 completed)', () => {
      it.each([
        [1, 0, 1],
        [1, 1, 2],
        [1, 2, 3],
        [1, 3, 4],
        [1, 4, 5],
        [1, 5, 6],
        [1, 10, 6],
      ])('%i completed, %i days since last => grade %i', (completed, daysSince, expected) => {
        expect(computeGrade(completed, 0, daysSince)).toBe(expected);
      });
    });

    describe('regular (6+ completed)', () => {
      it.each([
        [6, 6, 1],
        [6, 5, 2],
        [6, 3, 4],
        [6, 1, 6],
        [6, 0, 6],
        [10, 7, 1],
      ])('%i completed, %i in last 7 days => grade %i', (completed, last7, expected) => {
        expect(computeGrade(completed, last7, 0)).toBe(expected);
      });
    });
  });
});
