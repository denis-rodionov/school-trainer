import {
  fuzzyMatchText,
  findTextDifferences,
  getWordLevelDifferences,
} from './dictationScoring';

describe('dictationScoring', () => {
  describe('fuzzyMatchText', () => {
    it.each([
      ['Hello, world!', 'hello world', true],
      ['  Extra   spaces  ', 'extra spaces', true],
      ['Correct.', 'correct', true],
      ['Wrong answer', 'correct answer', false],
      ['', 'something', false],
      ['   ', 'something', false],
      ['café', 'cafe', false],
    ])('compare(%p, %p) => %p', (student, correct, expected) => {
      expect(fuzzyMatchText(student, correct)).toBe(expected);
    });
  });

  describe('findTextDifferences', () => {
    it('returns no errors for matching text', () => {
      expect(findTextDifferences('Hello world', 'hello, world!')).toEqual({
        hasErrors: false,
        wrongWords: [],
        missingWords: [],
      });
    });

    it('detects wrong and missing words', () => {
      const result = findTextDifferences('the cat sat', 'the dog sat on mat');
      expect(result.hasErrors).toBe(true);
      expect(result.wrongWords.length).toBeGreaterThan(0);
      expect(result.missingWords.length).toBeGreaterThan(0);
    });
  });

  describe('getWordLevelDifferences', () => {
    it('returns empty array for matching text', () => {
      expect(getWordLevelDifferences('Hello world', 'hello world')).toEqual([]);
    });

    it('returns word-level diffs for mismatches', () => {
      const diffs = getWordLevelDifferences('the cat', 'the dog');
      expect(diffs).toEqual([{ expected: 'dog', actual: 'cat' }]);
    });

    it('marks missing words with null actual', () => {
      const diffs = getWordLevelDifferences('the', 'the dog');
      expect(diffs).toEqual([{ expected: 'dog', actual: null }]);
    });
  });
});
