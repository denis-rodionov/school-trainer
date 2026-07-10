import {
  computeWorksheetScore,
  computeWorksheetScoreFromMistakes,
  MISTAKE_SCORE_PENALTY_PERCENT,
} from './worksheetScoring';

describe('worksheetScoring', () => {
  describe('computeWorksheetScore', () => {
    it.each([
      [8, 10, 80],
      [10, 10, 100],
      [0, 5, 0],
      [3, 4, 75],
    ])('computeWorksheetScore(%i, %i) => %i', (correct, total, expected) => {
      expect(computeWorksheetScore(correct, total)).toBe(expected);
    });

    it('returns 100 when total is zero', () => {
      expect(computeWorksheetScore(0, 0)).toBe(100);
    });
  });

  describe('computeWorksheetScoreFromMistakes', () => {
    it.each([
      [0, 100],
      [1, 95],
      [2, 90],
      [3, 85],
      [20, 0],
      [25, 0],
    ])('deducts %i * %i%% from 100 => %i', (mistakes, expected) => {
      expect(computeWorksheetScoreFromMistakes(mistakes)).toBe(expected);
    });

    it('uses the configured default penalty', () => {
      expect(MISTAKE_SCORE_PENALTY_PERCENT).toBe(5);
    });

    it('supports a custom penalty percent', () => {
      expect(computeWorksheetScoreFromMistakes(2, 10)).toBe(80);
    });
  });
});
