export {};

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

const validJson = JSON.stringify([
  { question: 'Who?', options: ['A', 'B', 'C'], correctIndex: 1 },
  { question: 'When?', options: ['Day', 'Night'], correctIndex: 0 },
]);

describe('aiReading service', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, REACT_APP_GEMINI_API_KEY: 'AIzaFakeKeyForTests' };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.resetModules();
  });

  it('parses valid JSON questions and clamps to the requested count', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockGeminiResponse(validJson));

    const { generateReadingQuestions } = await import('./aiReading');
    const result = await generateReadingQuestions({ fragment: 'text', questionCount: 1, language: 'en' });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ question: 'Who?', options: ['A', 'B', 'C'], correctIndex: 1 });
  });

  it('recovers JSON wrapped in code fences', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockGeminiResponse('```json\n' + validJson + '\n```')
    );

    const { generateReadingQuestions } = await import('./aiReading');
    const result = await generateReadingQuestions({ fragment: 'text', questionCount: 5, language: 'de' });
    expect(result).toHaveLength(2);
  });

  it('drops malformed questions and throws if none remain', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockGeminiResponse(JSON.stringify([{ question: '', options: [], correctIndex: 9 }]))
    );

    const { generateReadingQuestions } = await import('./aiReading');
    await expect(
      generateReadingQuestions({ fragment: 'text', questionCount: 2, language: 'en' })
    ).rejects.toThrow(/no valid reading questions/i);
  });

  it('throws on API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 403, message: 'PERMISSION_DENIED' } }),
    });

    const { generateReadingQuestions } = await import('./aiReading');
    await expect(
      generateReadingQuestions({ fragment: 'text', questionCount: 2, language: 'en' })
    ).rejects.toThrow(/Failed to generate reading questions/i);
  });

  it('throws when API key is missing', async () => {
    delete process.env.REACT_APP_GEMINI_API_KEY;
    jest.resetModules();
    const { generateReadingQuestions } = await import('./aiReading');
    await expect(
      generateReadingQuestions({ fragment: 'text', questionCount: 2, language: 'en' })
    ).rejects.toThrow(/REACT_APP_GEMINI_API_KEY/i);
  });
});
