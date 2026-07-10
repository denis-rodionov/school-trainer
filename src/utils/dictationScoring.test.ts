import {
  fuzzyMatchText,
  findTextDifferences,
  getWordLevelDifferences,
  normalizeText,
  wordsEquivalent,
} from './dictationScoring';

describe('dictationScoring', () => {
  describe('normalizeText', () => {
    it.each([
      ['Hello, world!', 'Hello world'],
      ['  Extra   spaces  ', 'Extra spaces'],
      ['„Guten Tag!"', 'Guten Tag'],
      ['Straße', 'Strasse'],
      ['straße', 'strasse'],
      ['grünen', 'gruenen'],
      ['café', 'cafe'],
    ])('normalizeText(%p) => %p', (input, expected) => {
      expect(normalizeText(input)).toBe(expected);
    });
  });

  describe('wordsEquivalent', () => {
    it('treats normalized German spellings as equivalent when case matches', () => {
      expect(wordsEquivalent('gruenen', 'grünen')).toBe(true);
      expect(wordsEquivalent('Strasse', 'Straße')).toBe(true);
    });

    it('rejects typos after normalization', () => {
      expect(wordsEquivalent('lauft', 'läuft')).toBe(false);
      expect(wordsEquivalent('runing', 'running')).toBe(false);
    });

    it('rejects case-only differences', () => {
      expect(wordsEquivalent('Hund', 'hund')).toBe(false);
      expect(wordsEquivalent('Der', 'der')).toBe(false);
      expect(wordsEquivalent('strasse', 'Strasse')).toBe(false);
    });

    it('rejects clearly different words', () => {
      expect(wordsEquivalent('cat', 'dog')).toBe(false);
      expect(wordsEquivalent('ab', 'cd')).toBe(false);
    });
  });

  describe('fuzzyMatchText', () => {
    it.each([
      ['Hello, world!', 'Hello world', true],
      ['Hello, world!', 'hello world', false],
      ['  Extra   spaces  ', 'Extra spaces', true],
      ['Correct.', 'Correct', true],
      ['Wrong answer', 'correct answer', false],
      ['', 'something', false],
      ['   ', 'something', false],
      ['café', 'cafe', true],
      ['Der Hund laeuft schnell im gruenen Park.', 'Der Hund läuft schnell im grünen Park.', true],
      ['Der Hund lauft schnell im grünen Park.', 'Der Hund läuft schnell im grünen Park.', false],
      ['Die Strasse ist lang.', 'Die Straße ist lang.', true],
      ['der Hund läuft schnell.', 'Der Hund läuft schnell.', false],
      ['Der hund läuft schnell.', 'Der Hund läuft schnell.', false],
    ])('compare(%p, %p) => %p', (student, correct, expected) => {
      expect(fuzzyMatchText(student, correct)).toBe(expected);
    });
  });

  describe('findTextDifferences', () => {
    it('returns no errors for matching text with same case', () => {
      expect(findTextDifferences('Hello world', 'Hello, world!')).toEqual({
        hasErrors: false,
        wrongWords: [],
        missingWords: [],
      });
    });

    it('flags case differences as errors', () => {
      expect(findTextDifferences('hello world', 'Hello world')).toEqual({
        hasErrors: true,
        wrongWords: ['hello'],
        missingWords: [],
      });
    });

    it('detects wrong and missing words without positional cascade', () => {
      expect(findTextDifferences('the cat sat', 'the dog sat on mat')).toEqual({
        hasErrors: true,
        wrongWords: ['cat'],
        missingWords: ['on', 'mat'],
      });
    });

    it('flags only the missing word when one word is omitted', () => {
      const correct = 'Der Hund läuft schnell im grünen Park.';
      const student = 'Der Hund läuft im grünen Park.';

      expect(findTextDifferences(student, correct)).toEqual({
        hasErrors: true,
        wrongWords: [],
        missingWords: ['schnell'],
      });
    });

    it('flags only the extra word when one word is inserted', () => {
      const correct = 'Der Hund läuft schnell im grünen Park.';
      const student = 'Der kleine Hund läuft schnell im grünen Park.';

      expect(findTextDifferences(student, correct)).toEqual({
        hasErrors: true,
        wrongWords: ['kleine'],
        missingWords: [],
      });
    });

    it('flags wrong noun capitalization in German', () => {
      const correct = 'Der Hund läuft schnell.';
      const student = 'Der hund läuft schnell.';

      expect(findTextDifferences(student, correct)).toEqual({
        hasErrors: true,
        wrongWords: ['hund'],
        missingWords: [],
      });
    });
  });

  describe('getWordLevelDifferences', () => {
    it('returns empty array for matching text with same case', () => {
      expect(getWordLevelDifferences('Hello world', 'Hello world')).toEqual([]);
    });

    it('flags case differences', () => {
      expect(getWordLevelDifferences('hello world', 'Hello world')).toEqual([
        { expected: 'Hello', actual: 'hello' },
      ]);
    });

    it('returns word-level diffs for mismatches', () => {
      expect(getWordLevelDifferences('the cat', 'the dog')).toEqual([
        { expected: 'dog', actual: 'cat' },
      ]);
    });

    it('marks missing words with null actual', () => {
      expect(getWordLevelDifferences('the', 'the dog')).toEqual([
        { expected: 'dog', actual: null },
      ]);
    });

    it('does not cascade when one word is missing in a longer sentence', () => {
      const correct = 'Der Hund läuft schnell im grünen Park.';
      const student = 'Der Hund läuft im grünen Park.';

      expect(getWordLevelDifferences(student, correct)).toEqual([
        { expected: 'schnell', actual: null },
      ]);
    });

    it('does not cascade when one extra word is inserted', () => {
      const correct = 'Der Hund läuft schnell im grünen Park.';
      const student = 'Der kleine Hund läuft schnell im grünen Park.';

      expect(getWordLevelDifferences(student, correct)).toEqual([
        { expected: null, actual: 'kleine' },
      ]);
    });

    it('reports substitution, missing, and extra words together', () => {
      expect(getWordLevelDifferences('the big dog sat', 'the dog sat on mat')).toEqual([
        { expected: null, actual: 'big' },
        { expected: 'on', actual: null },
        { expected: 'mat', actual: null },
      ]);
    });

    it('does not hide spelling typos as correct matches', () => {
      const correct = 'Der Hund läuft schnell im grünen Park.';
      const student = 'Der Hund lauft im gruenen Park';

      const diffs = getWordLevelDifferences(student, correct);
      expect(diffs.length).toBeGreaterThanOrEqual(2);
      expect(diffs.some((d) => d.actual === 'lauft')).toBe(true);
    });
  });
});
