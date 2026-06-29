export interface AiMarkdownValidationResult {
  valid: boolean;
  htmlMarkdown?: string;
  error?: string;
}

/**
 * Validate and convert AI-generated text from ____ (answer) format to HTML markdown with <input> tags.
 */
export function validateAndConvertToHtmlMarkdown(text: string): AiMarkdownValidationResult {
  const trimmedText = text.trim();

  const gapPattern = /____/g;
  const gapMatches = trimmedText.match(gapPattern);
  const gapCount = gapMatches ? gapMatches.length : 0;

  if (gapCount === 0) {
    return {
      valid: false,
      error: `AI generated exercise without any gaps. The exercise should contain "____" to indicate where students fill in answers. Generated text: "${trimmedText.substring(0, 100)}${trimmedText.length > 100 ? '...' : ''}"`,
    };
  }

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

  let result = trimmedText;

  result = result.replace(patternWithAnswer, (_match, answer) => {
    const trimmedAnswer = answer.trim();
    const escapedAnswer = trimmedAnswer
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    return `<input data-answer="${escapedAnswer}"/>`;
  });

  if (!result.match(/^<[^>]+>/)) {
    result = `<p>${result}</p>`;
  }

  return {
    valid: true,
    htmlMarkdown: result,
  };
}
