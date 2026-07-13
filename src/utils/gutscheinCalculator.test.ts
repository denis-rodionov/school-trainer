import {
  applyGutscheinsToGrade,
  applyWeeklyRefill,
  getIsoWeekKey,
  hasWorksheetCompletedInLast7Days,
  needsWeeklyRefill,
  gutscheinsForFirestore,
} from './gutscheinCalculator';

describe('gutscheinCalculator', () => {
  describe('getIsoWeekKey', () => {
    it('returns ISO week key for a date', () => {
      expect(getIsoWeekKey(new Date('2026-06-29'))).toBe('2026-W27');
    });
  });

  describe('needsWeeklyRefill', () => {
    it('returns true when last refill week is missing', () => {
      expect(needsWeeklyRefill(undefined, new Date('2026-06-29'))).toBe(true);
    });

    it('returns false in the same week', () => {
      expect(needsWeeklyRefill('2026-W27', new Date('2026-06-29'))).toBe(false);
    });

    it('returns true in a new week', () => {
      expect(needsWeeklyRefill('2026-W26', new Date('2026-06-29'))).toBe(true);
    });
  });

  describe('hasWorksheetCompletedInLast7Days', () => {
    const now = new Date('2026-06-29T10:00:00');

    it('returns true when a worksheet was completed within 7 days', () => {
      expect(
        hasWorksheetCompletedInLast7Days(
          [{ completedAt: new Date('2026-06-27T10:00:00') }],
          now
        )
      ).toBe(true);
    });

    it('returns false when the most recent worksheet is older than 7 days', () => {
      expect(
        hasWorksheetCompletedInLast7Days(
          [{ completedAt: new Date('2026-06-20T10:00:00') }],
          now
        )
      ).toBe(false);
    });

    it('returns false when there are no completed worksheets', () => {
      expect(hasWorksheetCompletedInLast7Days([], now)).toBe(false);
    });
  });

  describe('applyWeeklyRefill', () => {
    it('does not change balance in the same week', () => {
      const now = new Date('2026-06-29');
      expect(applyWeeklyRefill(3, 1, '2026-W27', now)).toEqual({
        balance: 3,
        lastWeeklyRefillWeek: '2026-W27',
      });
    });

    it('adds default weekly amount in a new week', () => {
      const now = new Date('2026-06-29');
      expect(applyWeeklyRefill(2, 1, '2026-W26', now)).toEqual({
        balance: 3,
        lastWeeklyRefillWeek: '2026-W27',
      });
    });

    it('refills on first visit with no prior week', () => {
      const now = new Date('2026-06-29');
      expect(applyWeeklyRefill(0, 2, undefined, now)).toEqual({
        balance: 2,
        lastWeeklyRefillWeek: '2026-W27',
      });
    });

    it('adds zero when default weekly is zero', () => {
      const now = new Date('2026-06-29');
      expect(applyWeeklyRefill(1, 0, '2026-W26', now)).toEqual({
        balance: 1,
        lastWeeklyRefillWeek: '2026-W27',
      });
    });
  });

  describe('applyGutscheinsToGrade', () => {
    it('returns null grade unchanged', () => {
      expect(applyGutscheinsToGrade(null, 2, 3)).toEqual({
        adjustedGrade: null,
        spent: 0,
      });
    });

    it('does not spend on first grade calculation', () => {
      expect(applyGutscheinsToGrade(3, undefined, 5)).toEqual({
        adjustedGrade: 3,
        spent: 0,
      });
    });

    it('does not spend when grade improves', () => {
      expect(applyGutscheinsToGrade(1, 3, 2)).toEqual({
        adjustedGrade: 1,
        spent: 0,
      });
    });

    it('does not spend when grade stays the same', () => {
      expect(applyGutscheinsToGrade(2, 2, 2)).toEqual({
        adjustedGrade: 2,
        spent: 0,
      });
    });

    it('fully protects one grade step with one Gutschein', () => {
      expect(applyGutscheinsToGrade(3, 2, 1)).toEqual({
        adjustedGrade: 2,
        spent: 1,
      });
    });

    it('partially protects when balance is insufficient', () => {
      expect(applyGutscheinsToGrade(5, 2, 2)).toEqual({
        adjustedGrade: 3,
        spent: 2,
      });
    });

    it('uses raw grade when balance is zero', () => {
      expect(applyGutscheinsToGrade(4, 2, 0)).toEqual({
        adjustedGrade: 4,
        spent: 0,
      });
    });

    it('does not spend negative balance', () => {
      expect(applyGutscheinsToGrade(3, 2, -1)).toEqual({
        adjustedGrade: 3,
        spent: 0,
      });
    });
  });

  describe('gutscheinsForFirestore', () => {
    it('never includes undefined lastWeeklyRefillWeek', () => {
      expect(gutscheinsForFirestore({ balance: 3, defaultWeekly: 1 })).toEqual({
        balance: 3,
        defaultWeekly: 1,
      });
    });

    it('includes lastWeeklyRefillWeek when set', () => {
      expect(
        gutscheinsForFirestore({
          balance: 3,
          defaultWeekly: 1,
          lastWeeklyRefillWeek: '2026-W27',
        })
      ).toEqual({ balance: 3, defaultWeekly: 1, lastWeeklyRefillWeek: '2026-W27' });
    });
  });
});
