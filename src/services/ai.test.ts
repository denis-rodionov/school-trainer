import { validateAndConvertToHtmlMarkdown } from '../utils/aiMarkdownConverter';

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
