/**
 * Translation Service using Google Gemini API
 * 
 * Translates text to German using the same Gemini model as exercise generation
 */

const translateToGerman = async (text: string): Promise<string> => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('REACT_APP_GEMINI_API_KEY environment variable is not set');
  }

  const trimmedKey = apiKey.trim();
  if (!trimmedKey.startsWith('AIza')) {
    throw new Error('Invalid API key format');
  }

  const modelName = process.env.REACT_APP_GEMINI_MODEL || 'gemini-2.5-flash';
  const apiVersion = process.env.REACT_APP_GEMINI_API_VERSION || 'v1beta';
  const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${trimmedKey}`;

  const prompt = `Translate the following text to German. Return ONLY the German translation, without any explanations, quotes, or additional text:\n\n${text}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.3, // Lower temperature for more consistent translations
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Translation failed' } }));
      const errorMessage = errorData.error?.message || `Translation failed: ${response.statusText}`;
      throw new Error(`Translation error: ${errorMessage}`);
    }

    const data = await response.json();
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!translatedText) {
      throw new Error('No translation generated in API response');
    }

    // Clean up the response - remove quotes if present, trim whitespace
    return translatedText.trim().replace(/^["']|["']$/g, '');
  } catch (error: any) {
    console.error('Translation error:', error);
    throw new Error(`Failed to translate: ${error.message}`);
  }
};

export { translateToGerman };
