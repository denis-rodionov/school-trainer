jest.mock('./ai');
jest.mock('./aiDictation');
jest.mock('./textToSpeech');

import { generateExerciseForTopic } from './exerciseGenerator';
import { generateExercises } from './ai';
import { generateDictationText } from './aiDictation';
import { generateAudioFromText } from './textToSpeech';
import { sampleFillGapsTopic, sampleDictationTopic } from '../test/fixtures';

const mockGenerateExercises = generateExercises as jest.MockedFunction<typeof generateExercises>;
const mockGenerateDictationText = generateDictationText as jest.MockedFunction<typeof generateDictationText>;
const mockGenerateAudioFromText = generateAudioFromText as jest.MockedFunction<typeof generateAudioFromText>;

describe('exerciseGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateExercises.mockResolvedValue([
      { markdown: '<p><input data-answer="6"/></p>', correctAnswers: ['6'] },
    ]);
    mockGenerateDictationText.mockResolvedValue('Hello world');
    mockGenerateAudioFromText.mockResolvedValue('https://example.com/audio.mp3');
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
});
