/**
 * AI Service for generating reading-comprehension multiple-choice questions
 * using the Google Gemini API.
 *
 * Given a text fragment, returns an array of questions, each with several options
 * and exactly one correct option. Uses Gemini Flash to stay within the cost budget.
 */

import { ReadingQuestion } from '../utils/readingParser';

export interface GenerateReadingQuestionsRequest {
  fragment: string;
  questionCount: number;
  language: string; // 'en' | 'de' | 'ru' etc. — language of the questions
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  ru: 'Russian',
};

const buildPrompt = (request: GenerateReadingQuestionsRequest): string => {
  const languageName = LANGUAGE_NAMES[request.language] || 'English';
  return `You are an educational assistant that creates reading-comprehension questions for children.

Read the following text fragment and create exactly ${request.questionCount} multiple-choice question(s) about it, written in ${languageName}.

Requirements:
1. Each question must be answerable from the fragment alone.
2. Each question must have 3 or 4 answer options, with exactly ONE correct option.
3. Vary the position of the correct option.
4. Keep questions and options short and age-appropriate.
5. Return ONLY valid JSON (no markdown, no commentary) as an array of objects with this exact shape:
[{"question": "...", "options": ["...", "..."], "correctIndex": 0}]
where correctIndex is the 0-based index of the correct option.

Text fragment:
"""
${request.fragment}
"""`;
};

const parseQuestionsJson = (raw: string, questionCount: number): ReadingQuestion[] => {
  // Strip code fences if the model wrapped the JSON.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try to recover the first JSON array in the text.
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) {
      throw new Error('AI returned invalid JSON for reading questions');
    }
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('AI response for reading questions was not an array');
  }

  const questions: ReadingQuestion[] = parsed
    .map((item: any): ReadingQuestion | null => {
      const question = typeof item?.question === 'string' ? item.question.trim() : '';
      const options = Array.isArray(item?.options)
        ? item.options.map((o: any) => String(o).trim()).filter((o: string) => o.length > 0)
        : [];
      const correctIndex = Number.isInteger(item?.correctIndex) ? item.correctIndex : -1;
      if (!question || options.length < 2 || correctIndex < 0 || correctIndex >= options.length) {
        return null;
      }
      return { question, options, correctIndex };
    })
    .filter((q): q is ReadingQuestion => q !== null);

  if (questions.length === 0) {
    throw new Error('AI returned no valid reading questions');
  }

  // Clamp to the requested count.
  return questions.slice(0, questionCount);
};

/**
 * Generate multiple-choice comprehension questions for a text fragment.
 */
export const generateReadingQuestions = async (
  request: GenerateReadingQuestionsRequest
): Promise<ReadingQuestion[]> => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'REACT_APP_GEMINI_API_KEY environment variable is not set.\n\n' +
        'Please add it to your .env.local file:\n' +
        'REACT_APP_GEMINI_API_KEY=your-key'
    );
  }

  const trimmedKey = apiKey.trim();
  if (!trimmedKey.startsWith('AIza')) {
    throw new Error('Invalid API key format. API keys should start with "AIza".');
  }

  const systemPrompt = buildPrompt(request);
  const modelName = process.env.REACT_APP_GEMINI_MODEL || 'gemini-2.5-flash';
  const apiVersion = process.env.REACT_APP_GEMINI_API_VERSION || 'v1beta';
  const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${trimmedKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          maxOutputTokens: 2000,
          thinkingConfig: { thinkingBudget: 0 },
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: 'AI generation failed' } }));
      const errorMessage = errorData.error?.message || `AI generation failed: ${response.statusText}`;
      throw new Error(`Failed to generate reading questions: ${errorMessage}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!generatedText) {
      throw new Error('No content generated for reading questions');
    }

    return parseQuestionsJson(generatedText, request.questionCount);
  } catch (error: any) {
    console.error('Reading question generation error:', error);
    throw new Error(`Failed to generate reading questions: ${error.message}`);
  }
};
