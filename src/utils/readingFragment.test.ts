import { selectFragment, previousParagraph, countWords } from './readingFragment';

// Helper: build a paragraph with exactly n words.
const words = (n: number, tag = 'w'): string => Array.from({ length: n }, (_, i) => `${tag}${i}`).join(' ');

describe('countWords', () => {
  it.each([
    ['', 0],
    ['   ', 0],
    ['one', 1],
    ['one two three', 3],
    ['  spaced   out  words ', 3],
  ])('counts %j as %i words', (text, expected) => {
    expect(countWords(text)).toBe(expected);
  });
});

describe('selectFragment', () => {
  it('always takes at least one paragraph even if it exceeds the target', () => {
    const paragraphs = [words(500), words(10)];
    const result = selectFragment(paragraphs, 0, 100);
    expect(result.paragraphs).toHaveLength(1);
    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(1);
  });

  it('prefers more words: keeps adding paragraphs until reaching the target', () => {
    const paragraphs = [words(50), words(50), words(50), words(50)];
    const result = selectFragment(paragraphs, 0, 120);
    // 50 + 50 = 100 (< 120, keep going) + 50 = 150 (>= 120, stop after adding)
    expect(result.paragraphs).toHaveLength(3);
    expect(result.endIndex).toBe(3);
  });

  it('stops before a paragraph that would overflow beyond 1.5x the target', () => {
    const paragraphs = [words(80), words(200)];
    // first: 80 (< 100). next would be 280 > 150 (100 * 1.5) -> stop, keep 1
    const result = selectFragment(paragraphs, 0, 100);
    expect(result.paragraphs).toHaveLength(1);
    expect(result.endIndex).toBe(1);
  });

  it('includes a paragraph that lands between target and 1.5x target', () => {
    const paragraphs = [words(80), words(60)];
    // first: 80 (< 100). next: 140 <= 150 -> add it
    const result = selectFragment(paragraphs, 0, 100);
    expect(result.paragraphs).toHaveLength(2);
    expect(result.endIndex).toBe(2);
  });

  it('starts from the given index', () => {
    const paragraphs = [words(50, 'a'), words(50, 'b'), words(50, 'c')];
    const result = selectFragment(paragraphs, 1, 40);
    expect(result.startIndex).toBe(1);
    expect(result.paragraphs[0]).toBe(paragraphs[1]);
    expect(result.endIndex).toBe(2);
  });

  it('returns an empty fragment at or past the end of the book', () => {
    const paragraphs = [words(50)];
    const result = selectFragment(paragraphs, 1, 100);
    expect(result.paragraphs).toHaveLength(0);
    expect(result.text).toBe('');
    expect(result.startIndex).toBe(1);
    expect(result.endIndex).toBe(1);
  });

  it('joins paragraphs with blank lines', () => {
    const paragraphs = ['Alpha', 'Beta'];
    const result = selectFragment(paragraphs, 0, 100);
    expect(result.text).toBe('Alpha\n\nBeta');
  });
});

describe('previousParagraph', () => {
  const paragraphs = ['meta', 'title', 'story-one', 'story-two'];

  it('returns empty string at the start of the book', () => {
    expect(previousParagraph(paragraphs, 0)).toBe('');
  });

  it('returns the paragraph before the start index', () => {
    expect(previousParagraph(paragraphs, 3)).toBe('story-one');
  });

  it('returns empty string for out-of-range indices', () => {
    expect(previousParagraph(paragraphs, 99)).toBe('');
  });

  it('returns empty when startIndex equals bookStartParagraph (first story fragment)', () => {
    expect(previousParagraph(paragraphs, 2, 2)).toBe('');
  });

  it('still shows prev once reading has moved past bookStartParagraph', () => {
    expect(previousParagraph(paragraphs, 3, 2)).toBe('story-one');
  });
});
