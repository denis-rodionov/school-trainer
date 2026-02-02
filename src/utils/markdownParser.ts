/**
 * Parses HTML markdown text with input tags (<input data-answer="...">) and extracts them for input fields
 * Returns the parsed structure with gaps replaced by input placeholders
 */

export interface ParsedGap {
  text: string;
  isGap: boolean;
  correctAnswer?: string;
  index: number;
}

export interface ParsedMarkdown {
  parts: ParsedGap[];
  correctAnswers: string[];
}

/**
 * Extract correct answers from HTML markdown with <input> tags
 * Pattern: <input[^>]*data-answer="([^"]*)"[^>]*>
 */
export const extractCorrectAnswers = (markdown: string): string[] => {
  const answers: string[] = [];
  // Match <input> tags with data-answer attribute
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
};

/**
 * Parse HTML markdown text and extract gaps
 * Only supports <input data-answer="..."> format
 */
export const parseMarkdown = (markdown: string): ParsedMarkdown => {
  const parts: ParsedGap[] = [];
  
  // Extract answers from <input> tags
  const extractedAnswers = extractCorrectAnswers(markdown);

  // Pattern for <input> tags with data-answer
  const inputPattern = /<input[^>]*data-answer="([^"]*)"[^>]*>/gi;
  let lastIndex = 0;
  let gapIndex = 0;
  let match;

  // Parse <input> tags
  while ((match = inputPattern.exec(markdown)) !== null) {
    // Add text before input tag
    if (match.index > lastIndex) {
      let textBefore = markdown.substring(lastIndex, match.index);
      // Strip HTML tags like <p>, </p>, <br>, etc. but keep the text content
      textBefore = textBefore
        .replace(/<p[^>]*>/gi, '')  // Remove opening <p> tags
        .replace(/<\/p>/gi, ' ')     // Replace closing </p> with space
        .replace(/<br\s*\/?>/gi, '\n')  // Replace <br> with newline
        .replace(/<[^>]+>/g, '');    // Remove any other HTML tags
      
      parts.push({
        text: textBefore,
        isGap: false,
        index: parts.length,
      });
    }

    // Add gap with correct answer
    parts.push({
      text: '',
      isGap: true,
      correctAnswer: extractedAnswers[gapIndex] || '',
      index: parts.length,
    });

    lastIndex = match.index + match[0].length;
    gapIndex++;
  }

  // Add remaining text
  if (lastIndex < markdown.length) {
    let remainingText = markdown.substring(lastIndex);
    // Strip HTML tags from remaining text
    remainingText = remainingText
      .replace(/<p[^>]*>/gi, '')  // Remove opening <p> tags
      .replace(/<\/p>/gi, ' ')     // Replace closing </p> with space
      .replace(/<br\s*\/?>/gi, '\n')  // Replace <br> with newline
      .replace(/<[^>]+>/g, '');    // Remove any other HTML tags
    
    parts.push({
      text: remainingText,
      isGap: false,
      index: parts.length,
    });
  }

  return {
    parts,
    correctAnswers: extractedAnswers,
  };
};

/**
 * Transform HTML markdown with user answers filled in
 * Used for storing completed worksheets
 * Replaces <input data-answer="..."/> with the user's answer
 */
export const transformMarkdownWithAnswers = (
  markdown: string,
  answers: string[]
): string => {
  let result = markdown;
  let answerIndex = 0;

  // Replace <input data-answer="..."/> with user's answer
  const inputPattern = /<input[^>]*data-answer="[^"]*"[^>]*>/gi;
  result = result.replace(inputPattern, () => {
    const answer = answers[answerIndex] || '';
    answerIndex++;
    // Escape HTML special characters in the answer
    const escapedAnswer = answer
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    return escapedAnswer;
  });

  return result;
};

/**
 * Extract all gaps from HTML markdown (returns array of empty strings for each gap)
 * Only supports <input> tags
 */
export const extractGaps = (markdown: string): string[] => {
  const gaps: string[] = [];
  
  // Count <input> tags with data-answer attribute
  const inputPattern = /<input[^>]*data-answer="[^"]*"[^>]*>/gi;
  let match;
  
  while ((match = inputPattern.exec(markdown)) !== null) {
    gaps.push('');
  }

  return gaps;
};
