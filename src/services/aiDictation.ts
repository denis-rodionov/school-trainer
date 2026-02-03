/**
 * AI Service for generating dictation exercises using Google Gemini API
 * 
 * Generates plain text (without gaps) for dictation exercises
 * The text will later be converted to audio using text-to-speech
 */

interface GenerateDictationRequest {
  prompt: string;
  topicName: string;
  exerciseNumber: number;
}

/**
 * Generate plain text for a dictation exercise using Gemini API
 * 
 * @param request - Dictation generation request with prompt and context
 * @returns Generated plain text (no gaps, no answer markers)
 */
export const generateDictationText = async (
  request: GenerateDictationRequest
): Promise<string> => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'REACT_APP_GEMINI_API_KEY environment variable is not set.\n\n' +
      'Please add it to your .env.local file:\n' +
      'REACT_APP_GEMINI_API_KEY=your-key'
    );
  }

  // Validate API key format
  const trimmedKey = apiKey.trim();
  if (!trimmedKey.startsWith('AIza')) {
    throw new Error('Invalid API key format. API keys should start with "AIza".');
  }

  // Generate randomization elements to encourage diversity
  const randomSeed = Math.floor(Math.random() * 1000000);
  const timestamp = Date.now();
  const randomVariation = Math.floor(Math.random() * 100);
  
  // Vary the instruction phrasing to encourage different outputs
  const diversityInstructions = [
    'CRITICAL: Generate UNIQUE text. Use different content, different wording, different structure.',
    'IMPORTANT: This must be COMPLETELY DIFFERENT from any previous text. Vary all aspects: content, words, format, order.',
    'ESSENTIAL: Create DISTINCT text. Change the values/content, change the phrasing, change the approach.',
    'REQUIRED: Generate FRESH text. Use different examples, different content, different presentation style.',
    'MANDATORY: Produce ORIGINAL text. Vary content, vary structure, vary presentation completely.',
  ];
  const diversityInstruction = diversityInstructions[request.exerciseNumber % diversityInstructions.length];
  
  // Add variation hints based on exercise number and random seed
  const variationHints = [
    `Use variation pattern ${randomVariation}.`,
    `Apply diversity modifier ${randomSeed % 1000}.`,
    `Follow uniqueness rule ${request.exerciseNumber * 7 + randomVariation}.`,
    `Use creative approach ${(request.exerciseNumber + randomSeed) % 50}.`,
  ];
  const variationHint = variationHints[request.exerciseNumber % variationHints.length];
  
  // Build the system prompt for dictation (plain text, no gaps)
  const systemPrompt = `You are an educational text generator for dictation exercises. Generate plain text based on the given prompt.

Requirements:
1. Generate ONLY plain text (no HTML, no gaps, no special markers)
2. The text should be suitable for dictation (students will listen and write it down)
3. Make it clear, educational, and appropriate for the topic
4. Return ONLY the text content - no explanations, no formatting markers
5. ${diversityInstruction}
6. Vary the content, words, and structure significantly from any previous exercises
7. Use COMPLETELY different examples, different word choices, different sentence structures, different contexts
8. AVOID repeating the same content, same values, same wording, or same structure
9. Be CREATIVE and ORIGINAL - each text should feel completely fresh and unique
10. ${variationHint}
11. Think RANDOMLY and UNPREDICTABLY - surprise yourself with unusual choices that still fit the prompt
12. CRITICAL: Use the random seed ${randomSeed} actively - transform it mathematically to select different content/words

Generate dictation text ${request.exerciseNumber} based on this prompt: ${request.prompt}

Diversity seed: ${randomSeed} | Timestamp: ${timestamp} | Variation: ${randomVariation}
Remember: This is dictation text ${request.exerciseNumber}. It MUST be completely different from dictation text ${request.exerciseNumber - 1} and any other text. Use different content, different words, different structure. Be creative and vary everything possible while still following the prompt requirements.`;

  // Get model name and API version from environment variables or use defaults
  const modelName = process.env.REACT_APP_GEMINI_MODEL || 'gemini-2.5-flash';
  const apiVersion = process.env.REACT_APP_GEMINI_API_VERSION || 'v1beta';
  const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${trimmedKey}`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 2000, // Increased to prevent truncation of longer texts
          temperature: 1.4, // Maximum temperature for maximum variation
          topP: 0.9,
          topK: 20,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'AI generation failed' } }));
      const errorMessage = errorData.error?.message || `AI generation failed: ${response.statusText}`;
      throw new Error(`Failed to generate dictation text: ${errorMessage}`);
    }

    const data = await response.json();
    
    // Check if response was truncated
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'MAX_TOKENS' || finishReason === 'OTHER') {
      console.warn(`⚠️ Response may be truncated. Finish reason: ${finishReason}`);
    }
    
    // Extract text from Gemini API response
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract token usage
    const usageMetadata = data.usageMetadata || {};
    const promptTokens = usageMetadata.promptTokenCount || 0;
    const candidatesTokens = usageMetadata.candidatesTokenCount || 0;
    const totalTokens = usageMetadata.totalTokenCount || (promptTokens + candidatesTokens);

    // Log generation details in a clean format
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎤 AI Dictation Text Generation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🤖 Model: ${modelName} (${apiVersion})`);
    console.log(`📋 Topic: ${request.topicName}`);
    console.log(`🔢 Exercise #${request.exerciseNumber}`);
    console.log('');
    console.log('📤 Prompt:');
    console.log(systemPrompt);
    console.log('');

    if (!generatedText) {
      throw new Error('No text generated in API response');
    }

    // Clean up the text - remove any HTML tags, extra whitespace, etc.
    const cleanedText = generatedText
      .trim()
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\n\s*\n/g, '\n') // Remove multiple blank lines
      .trim();

    if (!cleanedText) {
      throw new Error('Generated text is empty after cleaning');
    }

    // Check if response appears truncated (ends mid-sentence or mid-word)
    const trimmedText = cleanedText.trim();
    
    // Check if text ends with proper sentence-ending punctuation
    const endsWithPunctuation = /[.!?]$/.test(trimmedText);
    
    // Check if text ends mid-word (last word is very short, likely incomplete)
    const lastWord = trimmedText.split(/\s+/).pop() || '';
    const endsMidWord = lastWord.length < 3 && !endsWithPunctuation;
    
    // Check if finishReason indicates truncation
    const isTruncated = finishReason === 'MAX_TOKENS' || finishReason === 'OTHER';
    
    // Check if text appears incomplete (ends without punctuation and finishReason suggests truncation)
    // This catches cases like "Jeden" where the word is complete but sentence is not
    const appearsIncomplete = isTruncated && !endsWithPunctuation;
    
    // Throw error if we have strong evidence of truncation
    if (appearsIncomplete || endsMidWord) {
      throw new Error(
        `AI response was truncated. The dictation text generation was cut off before completion.\n\n` +
        `Generated so far: "${trimmedText.substring(0, 200)}${trimmedText.length > 200 ? '...' : ''}"\n\n` +
        `This usually happens when the response is too long. Try:\n` +
        `1. Simplifying the topic prompt to request shorter texts\n` +
        `2. The maxOutputTokens has been increased to 2000 to prevent this`
      );
    }
    
    // Log warning if finishReason suggests truncation but text looks complete
    if (finishReason === 'MAX_TOKENS' && endsWithPunctuation && !endsMidWord) {
      console.warn(`⚠️ Finish reason was MAX_TOKENS but response appears complete. This is usually safe to ignore.`);
    }

    console.log('📥 AI Output (text):');
    console.log(cleanedText);
    console.log('');
    console.log('💰 Token Usage:');
    console.log(`   Input tokens:  ${promptTokens.toLocaleString()}`);
    console.log(`   Output tokens: ${candidatesTokens.toLocaleString()}`);
    console.log(`   Total tokens:   ${totalTokens.toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return cleanedText;
  } catch (error: any) {
    console.error('Dictation text generation error:', error);
    throw new Error(`Failed to generate dictation text: ${error.message}`);
  }
};
