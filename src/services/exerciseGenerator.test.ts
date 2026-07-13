jest.mock('./ai');
jest.mock('./aiDictation');
jest.mock('./textToSpeech');
jest.mock('./aiReading');
jest.mock('./bookStorage');
jest.mock('./epub');

import { generateExerciseForTopic, readingPositionFor } from './exerciseGenerator';
import { generateExercises } from './ai';
import { generateDictationText } from './aiDictation';
import { generateAudioFromText } from './textToSpeech';
import { generateReadingQuestions } from './aiReading';
import { downloadBook } from './bookStorage';
import { loadBookParagraphs } from './epub';
import { sampleFillGapsTopic, sampleDictationTopic, sampleReadingTopic } from '../test/fixtures';
import { extractReadingRange, extractReadingQuestions } from '../utils/readingParser';

const mockGenerateExercises = generateExercises as jest.MockedFunction<typeof generateExercises>;
const mockGenerateDictationText = generateDictationText as jest.MockedFunction<typeof generateDictationText>;
const mockGenerateAudioFromText = generateAudioFromText as jest.MockedFunction<typeof generateAudioFromText>;
const mockGenerateReadingQuestions = generateReadingQuestions as jest.MockedFunction<typeof generateReadingQuestions>;
const mockDownloadBook = downloadBook as jest.MockedFunction<typeof downloadBook>;
const mockLoadBookParagraphs = loadBookParagraphs as jest.MockedFunction<typeof loadBookParagraphs>;

const buildParagraph = (n: number, tag: string) =>
  Array.from({ length: n }, (_, i) => `${tag}${i}`).join(' ');

describe('exerciseGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateExercises.mockResolvedValue([
      { markdown: '<p><input data-answer="6"/></p>', correctAnswers: ['6'] },
    ]);
    mockGenerateDictationText.mockResolvedValue('Hello world');
    mockGenerateAudioFromText.mockResolvedValue('https://example.com/audio.mp3');
    mockDownloadBook.mockResolvedValue(new ArrayBuffer(8));
    mockLoadBookParagraphs.mockResolvedValue([
      buildParagraph(60, 'a'),
      buildParagraph(60, 'b'),
      buildParagraph(60, 'c'),
      buildParagraph(60, 'd'),
    ]);
    mockGenerateReadingQuestions.mockResolvedValue([
      { question: 'Q1?', options: ['x', 'y'], correctIndex: 0 },
      { question: 'Q2?', options: ['x', 'y'], correctIndex: 1 },
    ]);
  });

  it('routes FILL_GAPS topics to AI generator', async () => {
    const exercises = await generateExerciseForTopic(sampleFillGapsTopic, 2);
    expect(mockGenerateExercises).toHaveBeenCalledWith(
      sampleFillGapsTopic.prompt,
      sampleFillGapsTopic.shortName,
      2,
      undefined
    );
    expect(mockGenerateDictationText).not.toHaveBeenCalled();
    expect(exercises).toHaveLength(1);
    expect(exercises[0]).toMatchObject({
      topicId: sampleFillGapsTopic.id,
      topicShortName: sampleFillGapsTopic.shortName,
      order: 0,
    });
  });

  it('routes DICTATION topics through text, TTS, and markdown pipeline', async () => {
    const exercises = await generateExerciseForTopic(sampleDictationTopic, 1);
    expect(mockGenerateDictationText).toHaveBeenCalledTimes(1);
    expect(mockGenerateAudioFromText).toHaveBeenCalledWith('Hello world', 'en');
    expect(exercises).toHaveLength(1);
    expect(exercises[0]).toMatchObject({
      topicId: sampleDictationTopic.id,
      audioUrl: 'https://example.com/audio.mp3',
      order: 0,
    });
    expect(exercises[0].markdown).toContain('<audio');
    expect(exercises[0].markdown).toContain('data-answer="Hello world"');
  });

  it('uses German language code for german subject dictation', async () => {
    const germanTopic = { ...sampleDictationTopic, subject: 'german' };
    await generateExerciseForTopic(germanTopic, 1);
    expect(mockGenerateAudioFromText).toHaveBeenCalledWith('Hello world', 'de');
  });

  it('routes READING topics through book loading and question generation', async () => {
    const exercises = await generateExerciseForTopic(sampleReadingTopic, 1, undefined, 0);

    expect(mockDownloadBook).toHaveBeenCalledWith('grimm');
    expect(mockLoadBookParagraphs).toHaveBeenCalledWith('grimm', expect.any(ArrayBuffer));
    expect(mockGenerateReadingQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ questionCount: 2, language: 'de' })
    );
    expect(exercises).toHaveLength(1);
    expect(exercises[0]).toMatchObject({ topicId: sampleReadingTopic.id, order: 0 });
    expect(extractReadingQuestions(exercises[0].markdown)).toHaveLength(2);
  });

  it('advances the reading cursor across consecutive exercises', async () => {
    const exercises = await generateExerciseForTopic(sampleReadingTopic, 2, undefined, 0);

    expect(exercises).toHaveLength(2);
    const first = extractReadingRange(exercises[0].markdown)!;
    const second = extractReadingRange(exercises[1].markdown)!;
    expect(first.startIndex).toBe(0);
    expect(second.startIndex).toBe(first.endIndex);
  });

  it('starts reading from the provided position', async () => {
    const exercises = await generateExerciseForTopic(sampleReadingTopic, 1, undefined, 2);
    const range = extractReadingRange(exercises[0].markdown)!;
    expect(range.startIndex).toBe(2);
  });

  it('readingPositionFor respects bookStartParagraph', () => {
    expect(readingPositionFor(undefined, 12)).toBe(12);
    expect(readingPositionFor(0, 12)).toBe(12);
    expect(readingPositionFor(20, 12)).toBe(20);
    expect(readingPositionFor(5, 12)).toBe(12);
  });
});
