import { validateAndConvertToHtmlMarkdown } from '../utils/aiMarkdownConverter';
import { buildExerciseSystemPrompt, deriveSuggestedNumbers } from './ai';

const originalFetch = global.fetch;
const originalEnv = process.env;

function mockGeminiResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    }),
  };
}

describe('buildExerciseSystemPrompt', () => {
  it('pre-computes suggested numbers instead of asking the model to show seed formulas', () => {
    const prompt = buildExerciseSystemPrompt(
      { prompt: '3-digit addition', topicName: 'Math', exerciseNumber: 1 },
      { randomSeed: 586000 }
    );

    expect(prompt).toContain('Suggested numbers for this exercise:');
    expect(prompt).toContain(deriveSuggestedNumbers(586000).join(', '));
    expect(prompt).not.toMatch(/seed % 100/i);
    expect(prompt).not.toMatch(/transform it mathematically/i);
    expect(prompt).not.toMatch(/Diversity seed:/i);
  });

  it('requires math exercises to match prompt difficulty and forbid modulo formulas', () => {
    const prompt = buildExerciseSystemPrompt(
      { prompt: 'addition and subtraction', topicName: 'Math', exerciseNumber: 2 },
      { randomSeed: 12345 }
    );

    expect(prompt).toMatch(/ONLY the operations described in the topic prompt/i);
    expect(prompt).toMatch(/Do NOT use nested parentheses, modulo/i);
    expect(prompt).toMatch(/literal numbers/i);
  });
});

describe('deriveSuggestedNumbers', () => {
  it('returns five concrete numbers from a seed', () => {
    expect(deriveSuggestedNumbers(586000)).toEqual([200, 114, 400, 67, 1]);
  });
});

describe('ai service', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, REACT_APP_GEMINI_API_KEY: 'AIzaFakeKeyForTests' };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.resetModules();
  });

  it('generateExercise converts AI text to HTML markdown on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockGeminiResponse('4+2=____ (6)'));

    const { generateExercise } = await import('./ai');
    const result = await generateExercise({
      prompt: 'addition',
      topicName: 'Addition',
      exerciseNumber: 1,
    });

    expect(result.markdown).toContain('data-answer="6"');
    expect(result.correctAnswers).toEqual(['6']);

    const fetchBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(fetchBody.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(fetchBody.generationConfig.temperature).toBe(1.0);
    expect(fetchBody.contents[0].parts[0].text).not.toMatch(/seed % 100/i);
  });

  it('generateExercise throws on API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 403, message: 'PERMISSION_DENIED' } }),
    });

    const { generateExercise } = await import('./ai');
    await expect(
      generateExercise({ prompt: 'x', topicName: 'T', exerciseNumber: 1 })
    ).rejects.toThrow(/Failed to generate exercise/i);
  });

  it('generateExercise throws when API key is missing', async () => {
    const savedKey = process.env.REACT_APP_GEMINI_API_KEY;
    delete process.env.REACT_APP_GEMINI_API_KEY;
    jest.resetModules();
    const { generateExercise } = await import('./ai');
    await expect(
      generateExercise({ prompt: 'x', topicName: 'T', exerciseNumber: 1 })
    ).rejects.toThrow(/REACT_APP_GEMINI_API_KEY/i);
    process.env.REACT_APP_GEMINI_API_KEY = savedKey;
    jest.resetModules();
  });
});

describe('validateAndConvertToHtmlMarkdown integration', () => {
  it('rejects truncated gap at end of AI output', () => {
    const result = validateAndConvertToHtmlMarkdown('Answer: ____ (');
    expect(result.valid).toBe(false);
  });
});
