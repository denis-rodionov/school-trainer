import {
  createReadingMarkdown,
  extractReadingRange,
  extractReadingPrev,
  extractReadingFragment,
  extractReadingQuestions,
  extractReadingSelections,
  updateReadingMarkdownWithSelections,
  isReadingMarkdown,
  ReadingQuestion,
} from './readingParser';

const questions: ReadingQuestion[] = [
  { question: 'Who went to the forest?', options: ['The wolf', 'The girl', 'The king'], correctIndex: 1 },
  { question: 'What time was it?', options: ['Morning', 'Night'], correctIndex: 0 },
];

const build = (prev = 'Previously read paragraph.') =>
  createReadingMarkdown({
    bookId: 'grimm',
    prevParagraph: prev,
    fragmentParagraphs: ['First paragraph.', 'Second paragraph.'],
    questions,
    startIndex: 120,
    endIndex: 128,
  });

describe('readingParser', () => {
  it('produces markdown recognized as a reading exercise', () => {
    expect(isReadingMarkdown(build())).toBe(true);
    expect(isReadingMarkdown('<div class="dictation-exercise"></div>')).toBe(false);
  });

  it('round-trips the range and book id', () => {
    const range = extractReadingRange(build());
    expect(range).toEqual({ bookId: 'grimm', startIndex: 120, endIndex: 128 });
  });

  it('extracts the previous paragraph and fragment', () => {
    const md = build();
    expect(extractReadingPrev(md)).toBe('Previously read paragraph.');
    expect(extractReadingFragment(md)).toEqual(['First paragraph.', 'Second paragraph.']);
  });

  it('omits the previous paragraph at the start of a book', () => {
    const md = build('');
    expect(extractReadingPrev(md)).toBe('');
  });

  it('extracts questions with options and correct index', () => {
    const parsed = extractReadingQuestions(build());
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual(questions[0]);
    expect(parsed[1]).toEqual(questions[1]);
  });

  it('starts with empty selections', () => {
    expect(extractReadingSelections(build())).toEqual(['', '']);
  });

  it('persists and reads back draft selections', () => {
    const updated = updateReadingMarkdownWithSelections(build(), ['1', '']);
    expect(extractReadingSelections(updated)).toEqual(['1', '']);
    // Questions and range survive the update
    expect(extractReadingQuestions(updated)).toHaveLength(2);
    expect(extractReadingRange(updated)?.endIndex).toBe(128);
  });

  it('escapes special characters in text content', () => {
    const md = createReadingMarkdown({
      bookId: 'grimm',
      prevParagraph: '',
      fragmentParagraphs: ['A & B <tag> "quote"'],
      questions: [{ question: 'Is 1 < 2?', options: ['Yes & sure', 'No'], correctIndex: 0 }],
      startIndex: 0,
      endIndex: 1,
    });
    expect(extractReadingFragment(md)).toEqual(['A & B <tag> "quote"']);
    expect(extractReadingQuestions(md)[0].question).toBe('Is 1 < 2?');
  });
});
