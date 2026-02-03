/**
 * AI Service for generating exercises using Google Gemini API
 * 
 * Uses gemini-2.5-flash (cheapest Flash model, newest version)
 * Pricing: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
 * 
 * Other available Flash models:
 * - gemini-flash-latest (latest stable)
 * - gemini-2.0-flash (older version)
 * - gemini-2.0-flash-lite (even cheaper lite version)
 * 
 * Setup required:
 * 1. Get API key from Google Cloud Console > APIs & Services > Credentials
 * 2. Add REACT_APP_GEMINI_API_KEY to .env.local
 * 3. (Optional) Add REACT_APP_GEMINI_MODEL to .env.local to use different model
 * 4. Restrict API key to your domain in Google Cloud Console
 */

interface GenerateExerciseRequest {
  prompt: string;
  topicName: string;
  exerciseNumber: number;
}

interface GeneratedExercise {
  markdown: string;
  correctAnswers: string[];
  tokenUsage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate a single exercise using Gemini API
 * 
 * @param request - Exercise generation request with prompt and context
 * @returns Generated exercise with markdown and correct answers
 */
export const generateExercise = async (
  request: GenerateExerciseRequest
): Promise<GeneratedExercise> => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  
  if (!apiKey) {
    // Provide helpful debugging information
    const envKeys = Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'));
    const hasFirebaseKeys = envKeys.some(key => key.includes('FIREBASE'));
    
    throw new Error(
      'REACT_APP_GEMINI_API_KEY environment variable is not set.\n\n' +
      'Troubleshooting steps:\n' +
      '1. Verify .env.local exists in the project root with: REACT_APP_GEMINI_API_KEY=your-key\n' +
      '2. Restart the dev server (stop with Ctrl+C, then run "npm start" again)\n' +
      '3. Environment variables are only loaded when the server starts\n' +
      `4. Found ${envKeys.length} REACT_APP_* variables: ${envKeys.length > 0 ? (hasFirebaseKeys ? 'Firebase keys found, but Gemini key missing' : envKeys.join(', ')) : 'none found'}\n\n` +
      'Get your API key from https://makersuite.google.com/app/apikey'
    );
  }

  // Validate API key format
  const trimmedKey = apiKey.trim();
  if (!trimmedKey.startsWith('AIza')) {
    throw new Error(
      `Invalid API key format. API keys should start with "AIza".\n\n` +
      `Your key starts with: "${trimmedKey.substring(0, 5)}..."\n\n` +
      `Please check:\n` +
      `1. The key in .env.local is correct\n` +
      `2. No extra spaces or quotes around the key\n` +
      `3. The key wasn't accidentally truncated\n` +
      `4. Get a fresh key from Google Cloud Console > APIs & Services > Credentials`
    );
  }

  // Generate randomization elements to encourage diversity
  const randomSeed = Math.floor(Math.random() * 1000000);
  const timestamp = Date.now();
  const randomVariation = Math.floor(Math.random() * 100);
  
  // Generate random number ranges to encourage variety
  // Use the random seed to create different "preferred ranges" for each exercise
  const rangeStart = (randomSeed % 50) + 1; // 1-50
  const rangeEnd = rangeStart + 20 + (randomVariation % 30); // Range of 20-50 numbers
  const preferredRange = `${rangeStart}-${rangeEnd}`;
  
  // Create a "number selection strategy" based on exercise number and seed
  const strategies = [
    'Use numbers from different ranges - mix small, medium, and large numbers',
    'Vary number patterns - use odd numbers, even numbers, prime numbers, composite numbers',
    'Explore different number ranges - don\'t stick to the same range',
    'Use the random seed to pick numbers - let it guide your selection',
    'Vary number magnitudes - mix single digits, double digits, triple digits',
  ];
  const numberStrategy = strategies[request.exerciseNumber % strategies.length];
  
  // Vary the instruction phrasing to encourage different outputs
  const diversityInstructions = [
    'CRITICAL: Generate a UNIQUE exercise. Use different content, different wording, different structure.',
    'IMPORTANT: This must be COMPLETELY DIFFERENT from any previous exercise. Vary all aspects: content, words, format, order.',
    'ESSENTIAL: Create a DISTINCT exercise. Change the values/content, change the phrasing, change the approach.',
    'REQUIRED: Generate a FRESH exercise. Use different examples, different content, different presentation style.',
    'MANDATORY: Produce an ORIGINAL exercise. Vary content, vary structure, vary presentation completely.',
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
  
  // Build the system prompt with enhanced diversity instructions (general for all subjects)
  const systemPrompt = `You are an educational exercise generator. Generate a single exercise based on the given prompt.

Requirements:
1. The exercise should be plain text (not HTML)
2. Use ____ (four underscores) to indicate gaps that students need to fill
3. After each gap, include the correct answer in parentheses: ____ (answer)
4. The exercise can have one or more gaps
5. Each gap must be followed by its correct answer in parentheses
6. Make it clear and educational
7. Return ONLY the exercise text with gaps marked as ____ (answer)
8. ${diversityInstruction}
9. CRITICAL: Vary the content, values, words, and structure DRAMATICALLY from any previous exercises
10. Use COMPLETELY different examples, different word choices, different sentence structures, different contexts
11. AVOID repeating the same content, same values, same wording, or same structure - even if they fit the prompt
12. Be CREATIVE and ORIGINAL - each exercise should feel completely fresh and unique
13. If using numbers: ${numberStrategy}. Use the random seed ${randomSeed} to select numbers - convert it to guide your number choices (e.g., use seed mod 100, or seed/1000, or other transformations). EXPLORE the full range of valid numbers - don't repeat the same numbers from previous exercises.
14. If using words, use DIFFERENT vocabulary, different sentence patterns, different contexts
15. ${variationHint}
16. Think RANDOMLY and UNPREDICTABLY - surprise yourself with unusual choices that still fit the prompt
17. CRITICAL: Use the random seed ${randomSeed} actively - transform it mathematically to select different numbers/words. For example: (seed % 100), (seed / 1000), (seed * 7 % 50), etc. This ensures each exercise uses different values.

Example formats (DO NOT copy these exactly - create your own variations):
"5 + ____ (3) = 8"
"4+2=____ (6)"
"Fill in the blank: The capital of France is ____ (Paris)"
"Complete: I ____ (am) a student."
"Der ____ (Hund) ist braun."
"Translate: I am ____ (ich bin) a student."

Generate exercise ${request.exerciseNumber} based on this prompt: ${request.prompt}

Diversity seed: ${randomSeed} | Timestamp: ${timestamp} | Variation: ${randomVariation}
ANTI-REPETITION RULE: This is exercise ${request.exerciseNumber}. It MUST be COMPLETELY DIFFERENT from exercise ${request.exerciseNumber - 1} and ANY other exercise. 
- Use DIFFERENT content, DIFFERENT words, DIFFERENT structure
- If using numbers: USE THE RANDOM SEED ${randomSeed} to mathematically derive your numbers. Transform the seed: try (seed % 100), (seed / 1000 % 50), (seed * 3 % 99), etc. This ensures you use DIFFERENT numbers each time. EXPLORE the full valid range - don't stick to the same few numbers.
- If using words, use DIFFERENT vocabulary and sentence patterns
- Be UNPREDICTABLE and CREATIVE - make unexpected choices that still follow the prompt requirements
- Think outside the box - surprise with variety
- Number selection: Use mathematical transformations of seed ${randomSeed} to pick numbers. Example: if seed=123456, try 123456%100=56, but also try 123456/1000%50=23, or 123456*7%99=84. Vary the transformation formula each time.`;

  // Get model name and API version from environment variables or use defaults
  // Using gemini-2.5-flash (cheapest Flash model, newest version) with v1beta API
  // Other available Flash models: gemini-flash-latest, gemini-2.0-flash, gemini-2.0-flash-lite
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
          maxOutputTokens: 2000, // Increased to prevent truncation of longer exercises
          temperature: 1.4, // Maximum temperature (1.4) for maximum variation and creativity
          topP: 0.9, // Lower topP (0.9 instead of 0.95) to consider more diverse token options
          topK: 20, // Lower topK (20 instead of 40) to force more exploration of less likely tokens
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'AI generation failed' } }));
      const errorMessage = errorData.error?.message || `AI generation failed: ${response.statusText}`;
      const errorCode = errorData.error?.code || response.status;
      
      // Log full error for debugging
      console.error('Gemini API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error,
        model: modelName,
        apiVersion: apiVersion,
        url: apiUrl.replace(trimmedKey, 'HIDDEN'),
        apiKeyLength: trimmedKey.length,
        apiKeyPrefix: trimmedKey.substring(0, 10) + '...'
      });
      
      // If model not found, provide helpful error with debugging steps
      if (errorMessage.includes('not found') || errorMessage.includes('not supported')) {
        throw new Error(
          `Model "${modelName}" is not available for API version "${apiVersion}".\n\n` +
          `Debugging steps:\n` +
          `1. Check billing: Go to Cloud Console > Billing > Make sure billing account is linked\n` +
          `2. Verify API enabled: Go to APIs & Services > Enabled APIs > Search "Generative Language API"\n` +
          `3. Check quotas: Go to APIs & Services > Quotas > Search "Gemini" > Make sure not set to 0\n` +
          `4. Try listing models in browser console:\n` +
          `   const apiKey = 'YOUR_KEY';\n` +
          `   fetch(\`https://generativelanguage.googleapis.com/v1beta/models?key=\${apiKey}\`)\n` +
          `     .then(r => r.json())\n` +
          `     .then(d => console.log('Available models:', d.models?.map(m => m.name)));\n` +
          `5. Try different model/version in .env.local:\n` +
          `   REACT_APP_GEMINI_MODEL=gemini-pro\n` +
          `   REACT_APP_GEMINI_API_VERSION=v1\n\n` +
          `Error code: ${errorCode}\n` +
          `Original error: ${errorMessage}`
        );
      }
      
      // Check for invalid API key errors (400)
      if (errorCode === 400 && (errorMessage.includes('API key not valid') || errorMessage.includes('INVALID_ARGUMENT'))) {
        throw new Error(
          `Invalid API key (400). The API key is not valid or has been revoked.\n\n` +
          `Fix steps:\n` +
          `1. Check .env.local - make sure the key is correct:\n` +
          `   REACT_APP_GEMINI_API_KEY=AIza... (should start with AIza)\n` +
          `   - No quotes around the key\n` +
          `   - No extra spaces\n` +
          `   - Full key copied (usually 39 characters)\n\n` +
          `2. Verify the key in Google Cloud Console:\n` +
          `   - Go to APIs & Services > Credentials\n` +
          `   - Find your API key\n` +
          `   - Check if it's still active (not deleted/revoked)\n\n` +
          `3. Create a new API key:\n` +
          `   - Go to APIs & Services > Credentials\n` +
          `   - Click "+ CREATE CREDENTIALS" > "API key"\n` +
          `   - Copy the new key\n` +
          `   - Update .env.local\n` +
          `   - Restart dev server\n\n` +
          `4. Check if key is from correct project:\n` +
          `   - Make sure key is from "school-trainer-70cb5" project\n` +
          `   - Not from "Default Gemini Project" or another project\n\n` +
          `Error code: ${errorCode}\n` +
          `Original error: ${errorMessage}`
        );
      }
      
      // Check for billing/permission errors
      if (errorCode === 403 || errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('billing')) {
        throw new Error(
          `Permission denied (403). Possible causes:\n\n` +
          `1. Billing not enabled:\n` +
          `   - Go to Cloud Console > Billing\n` +
          `   - Link a billing account to your project\n` +
          `   - Generative Language API requires billing (but has free tier)\n\n` +
          `2. API not fully enabled:\n` +
          `   - Wait 2-3 minutes after enabling\n` +
          `   - Check "Enabled APIs" page\n\n` +
          `3. Quota exceeded:\n` +
          `   - Go to APIs & Services > Quotas\n` +
          `   - Check if daily/minute quotas are set to 0\n\n` +
          `Error code: ${errorCode}\n` +
          `Original error: ${errorMessage}`
        );
      }
      
      throw new Error(`API Error (${errorCode}): ${errorMessage}`);
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
    console.log('📝 AI Exercise Generation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🤖 Model: ${modelName} (${apiVersion})`);
    console.log(`📋 Topic: ${request.topicName}`);
    console.log(`🔢 Exercise #${request.exerciseNumber}`);
    console.log('');
    console.log('📤 Prompt:');
    console.log(systemPrompt);
    console.log('');
    console.log('📥 AI Output (text):');
    console.log(generatedText.trim());
    console.log('');
    console.log('💰 Token Usage:');
    console.log(`   Input tokens:  ${promptTokens.toLocaleString()}`);
    console.log(`   Output tokens: ${candidatesTokens.toLocaleString()}`);
    console.log(`   Total tokens:   ${totalTokens.toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!generatedText) {
      throw new Error('No text generated in API response');
    }

    // Check if response appears truncated (ends with incomplete answer)
    const trimmedText = generatedText.trim();
    
    // Only throw error if we actually detect an incomplete gap pattern at the end
    // Don't rely solely on finishReason as it can be 'MAX_TOKENS' even for complete responses
    // Check if text ends with incomplete gap pattern: "____ (" or "____ (something" without closing parenthesis
    const hasIncompleteGap = trimmedText.endsWith('____ (') || 
                              trimmedText.match(/____\s*\([^)]*$/); // Gap with opening paren but no closing paren at end
    
    // Only throw error if we have clear evidence of truncation:
    // Text ends with an incomplete gap pattern (missing closing parenthesis)
    if (hasIncompleteGap) {
      throw new Error(
        `AI response was truncated. The exercise generation was cut off before completion.\n\n` +
        `Generated so far: "${trimmedText.substring(0, 200)}${trimmedText.length > 200 ? '...' : ''}"\n\n` +
        `This usually happens when the response is too long. Try:\n` +
        `1. Simplifying the topic prompt\n` +
        `2. Requesting shorter exercises\n` +
        `3. The maxOutputTokens has been increased to 2000 to prevent this`
      );
    }
    
    // Log warning if finishReason suggests truncation but text looks complete
    if (finishReason === 'MAX_TOKENS') {
      console.warn(`⚠️ Finish reason was MAX_TOKENS. Response length: ${trimmedText.length} chars. If the exercise looks complete, this is safe to ignore.`);
    }

    // Validate and convert AI-generated text (____ (answer) format) to HTML markdown with <input> tags
    const validationResult = validateAndConvertToHtmlMarkdown(trimmedText);
    
    if (!validationResult.valid) {
      throw new Error(validationResult.error || 'Invalid exercise format generated by AI');
    }

    return {
      markdown: validationResult.htmlMarkdown!,
      correctAnswers: extractAnswersFromMarkdown(validationResult.htmlMarkdown!),
      tokenUsage: {
        promptTokens,
        candidatesTokens,
        totalTokens,
      },
    };
  } catch (error: any) {
    console.error('AI generation error:', error);
    throw new Error(`Failed to generate exercise: ${error.message}`);
  }
};

interface ValidationResult {
  valid: boolean;
  htmlMarkdown?: string;
  error?: string;
}

/**
 * Validate and convert AI-generated text from ____ (answer) format to HTML markdown with <input> tags
 * Validates that:
 * 1. The text contains at least one gap (____)
 * 2. Every gap has a corresponding answer in parentheses
 * 
 * Example: "4+2=____ (6)" -> "<p>4+2=<input data-answer=\"6\"/></p>"
 * Example: "Calculate: 5 + ____ (3) = 8" -> "<p>Calculate: 5 + <input data-answer=\"3\"/> = 8</p>"
 */
function validateAndConvertToHtmlMarkdown(text: string): ValidationResult {
  const trimmedText = text.trim();
  
  // Check if text contains any gaps (____)
  const gapPattern = /____/g;
  const gapMatches = trimmedText.match(gapPattern);
  const gapCount = gapMatches ? gapMatches.length : 0;
  
  if (gapCount === 0) {
    return {
      valid: false,
      error: `AI generated exercise without any gaps. The exercise should contain "____" to indicate where students fill in answers. Generated text: "${trimmedText.substring(0, 100)}${trimmedText.length > 100 ? '...' : ''}"`,
    };
  }
  
  // Check if all gaps have answers in parentheses
  // Pattern: ____ (answer) - matches four underscores followed by optional space and answer in parentheses
  const patternWithAnswer = /____\s*\(([^)]+)\)/g;
  const answerMatches = trimmedText.match(patternWithAnswer);
  const answerCount = answerMatches ? answerMatches.length : 0;
  
  if (answerCount < gapCount) {
    const missingCount = gapCount - answerCount;
    return {
      valid: false,
      error: `AI generated exercise with ${gapCount} gap(s) but only ${answerCount} answer(s) in parentheses. Every gap must be followed by an answer in parentheses like "____ (answer)". Missing ${missingCount} answer(s). Generated text: "${trimmedText.substring(0, 150)}${trimmedText.length > 150 ? '...' : ''}"`,
    };
  }
  
  // Convert to HTML markdown
  let result = trimmedText;
  
  // Replace all occurrences of ____ (answer) with <input data-answer="answer"/>
  result = result.replace(patternWithAnswer, (match, answer) => {
    // Trim the answer and escape HTML special characters
    const trimmedAnswer = answer.trim();
    const escapedAnswer = trimmedAnswer
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    return `<input data-answer="${escapedAnswer}"/>`;
  });
  
  // Wrap the result in <p> tags if it doesn't already start with an HTML tag
  // Check if it already contains HTML tags at the start
  if (!result.match(/^<[^>]+>/)) {
    result = `<p>${result}</p>`;
  }
  
  return {
    valid: true,
    htmlMarkdown: result,
  };
}

/**
 * Extract correct answers from HTML markdown text
 * Extracts answers from <input data-answer="..."> attributes
 */
function extractAnswersFromMarkdown(markdown: string): string[] {
  const answers: string[] = [];
  
  // Extract from <input> tags with data-answer attribute
  const inputPattern = /<input[^>]*data-answer="([^"]*)"[^>]*>/gi;
  let match;
  
  while ((match = inputPattern.exec(markdown)) !== null) {
    // Unescape HTML entities
    const answer = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    answers.push(answer);
  }

  return answers;
}

/**
 * Generate multiple exercises for a topic
 * @param topicPrompt - The prompt for generating exercises
 * @param topicName - Name of the topic
 * @param count - Number of exercises to generate
 * @param onProgress - Optional callback for progress updates (current, total)
 */
export const generateExercises = async (
  topicPrompt: string,
  topicName: string,
  count: number,
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedExercise[]> => {
  const exercises: GeneratedExercise[] = [];
  let totalPromptTokens = 0;
  let totalCandidatesTokens = 0;
  let totalTokens = 0;

  // Generate exercises sequentially to avoid rate limits
  for (let i = 1; i <= count; i++) {
    try {
      const exercise = await generateExercise({
        prompt: topicPrompt,
        topicName,
        exerciseNumber: i,
      });
      exercises.push(exercise);
      
      // Update progress
      if (onProgress) {
        onProgress(i, count);
      }
      
      // Accumulate token usage
      if (exercise.tokenUsage) {
        totalPromptTokens += exercise.tokenUsage.promptTokens;
        totalCandidatesTokens += exercise.tokenUsage.candidatesTokens;
        totalTokens += exercise.tokenUsage.totalTokens;
      }
      
      // Small delay to avoid rate limits
      if (i < count) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(`Failed to generate exercise ${i}:`, error);
      // Re-throw the error so the user sees what went wrong
      // Don't create placeholder exercises - let user know there's an issue
      throw new Error(`Exercise ${i} of ${count} for topic "${topicName}": ${error.message}`);
    }
  }

  // Log total token usage for the worksheet
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Worksheet Generation Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Topic: ${topicName}`);
  console.log(`🔢 Exercises generated: ${exercises.length}`);
  console.log('');
  console.log('💰 Total Token Usage:');
  console.log(`   Input tokens:  ${totalPromptTokens.toLocaleString()}`);
  console.log(`   Output tokens: ${totalCandidatesTokens.toLocaleString()}`);
  console.log(`   Total tokens:   ${totalTokens.toLocaleString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return exercises;
};

/**
 * List available Gemini models for your API key
 * Call this function in browser console to see what models are available
 * Usage: import { listAvailableModels } from './services/ai'; listAvailableModels();
 */
export const listAvailableModels = async (): Promise<void> => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('REACT_APP_GEMINI_API_KEY is not set');
    return;
  }

  // Try both v1beta and v1 to find all available models
  const apiVersions = ['v1beta', 'v1'];
  
  for (const version of apiVersions) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        console.warn(`Failed to list models for ${version}:`, error.error?.message || 'Unknown error');
        continue;
      }
      
      const data = await response.json();
      const models = data.models || [];
      const supportedModels = models.filter((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent')
      );
      
      if (supportedModels.length > 0) {
        console.log(`\n=== Available Models (${version}) ===`);
        supportedModels.forEach((model: any) => {
          const name = model.name?.replace('models/', '') || 'unknown';
          const displayName = model.displayName || 'N/A';
          console.log(`✓ ${name} - ${displayName}`);
        });
        
        // Find the cheapest model (usually Flash)
        const flashModel = supportedModels.find((m: any) => 
          m.name?.toLowerCase().includes('flash')
        );
        
        if (flashModel) {
          const modelName = flashModel.name.replace('models/', '');
          console.log(`\n💡 Recommended (cheapest): ${modelName}`);
          console.log(`\nAdd to .env.local:`);
          console.log(`REACT_APP_GEMINI_MODEL=${modelName}`);
          console.log(`REACT_APP_GEMINI_API_VERSION=${version}\n`);
        }
      }
    } catch (error: any) {
      console.warn(`Error checking ${version}:`, error.message);
    }
  }
};
