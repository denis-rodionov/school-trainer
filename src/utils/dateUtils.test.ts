import { formatWorksheetDate, isWithinLastDays } from './dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatWorksheetDate', () => {
    it('returns today for current date', () => {
      expect(formatWorksheetDate(new Date('2026-06-15T10:00:00Z'))).toBe('today');
    });

    it('returns yesterday for previous day', () => {
      expect(formatWorksheetDate(new Date('2026-06-14T10:00:00Z'))).toBe('yesterday');
    });

    it('returns days ago for recent dates', () => {
      expect(formatWorksheetDate(new Date('2026-06-12T10:00:00Z'))).toBe('3 days ago');
    });

    it('returns Never for falsy date', () => {
      expect(formatWorksheetDate(null)).toBe('Never');
    });

    it('handles Firestore-like timestamp objects', () => {
      const ts = { toDate: () => new Date('2026-06-15T10:00:00Z') };
      expect(formatWorksheetDate(ts)).toBe('today');
    });
  });

  describe('isWithinLastDays', () => {
    it('returns true for date within range', () => {
      expect(isWithinLastDays(new Date('2026-06-13T10:00:00Z'), 7)).toBe(true);
    });

    it('returns false for date outside range', () => {
      expect(isWithinLastDays(new Date('2026-06-01T10:00:00Z'), 7)).toBe(false);
    });

    it('returns false for falsy date', () => {
      expect(isWithinLastDays(null, 7)).toBe(false);
    });
  });
});
