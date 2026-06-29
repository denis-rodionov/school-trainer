import { computeWorksheetScore } from './worksheetScoring';

describe('worksheetScoring', () => {
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
