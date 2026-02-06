/**
 * Parses HTML markdown text with input tags (<input data-answer="...">) and extracts them for input fields
 * Returns the parsed structure with gaps replaced by input placeholders
 */

export interface ParsedGap {
  text: string;
  isGap: boolean;
  correctAnswer?: string;
  index: number;
  inputType?: 'text' | 'textarea'; // Type of input field
}

export interface ParsedMarkdown {
  parts: ParsedGap[];
  correctAnswers: string[];
}

/**
 * Extract correct answers from HTML markdown with <input> or <textarea> tags
 * Pattern: <input[^>]*data-answer="([^"]*)"[^>]*> or <textarea[^>]*data-answer="([^"]*)"[^>]*>
 */
export const extractCorrectAnswers = (markdown: string): string[] => {
  const answers: string[] = [];
  const text = markdown ?? '';
  // Match <input> tags with data-answer attribute
  const inputPattern = /<input[^>]*data-answer="([^"]*)"[^>]*>/gi;
  let match;

  while ((match = inputPattern.exec(text)) !== null) {
    // Unescape HTML entities
    const answer = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    answers.push(answer);
  }

  // Also match <textarea> tags with data-answer attribute (for dictation)
  const textareaPattern = /<textarea[^>]*data-answer="([^"]*)"[^>]*>/gi;
  while ((match = textareaPattern.exec(text)) !== null) {
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
 * Extract audio URL from markdown
 * Looks for <audio src="..."> tags
 */
export const extractAudioUrl = (markdown: string): string | null => {
  const text = markdown ?? '';
  const audioPattern = /<audio[^>]*src=["']([^"']+)["'][^>]*>/i;
  const match = text.match(audioPattern);
  return match ? match[1] : null;
};

/**
 * Parse HTML markdown text and extract gaps
 * Only supports <input data-answer="..."> format
 */
export const parseMarkdown = (markdown: string): ParsedMarkdown => {
  const parts: ParsedGap[] = [];
  const text = markdown ?? '';
  // Extract answers from <input> tags
  const extractedAnswers = extractCorrectAnswers(text);

  // Pattern for <input> tags with data-answer
  const inputPattern = /<input[^>]*data-answer="([^"]*)"[^>]*>/gi;
  let lastIndex = 0;
  let gapIndex = 0;
  let match;

  // Parse <input> tags
  while ((match = inputPattern.exec(text)) !== null) {
    // Add text before input tag
    if (match.index > lastIndex) {
      let textBefore = text.substring(lastIndex, match.index);
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
  if (lastIndex < text.length) {
    let remainingText = text.substring(lastIndex);
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

  // Also replace <textarea data-answer="...">...</textarea> with user's answer (for dictation)
  const textareaPattern = /<textarea[^>]*data-answer="[^"]*"[^>]*>.*?<\/textarea>/gi;
  result = result.replace(textareaPattern, () => {
    const answer = answers[answerIndex] || '';
    answerIndex++;
    // Escape HTML special characters and preserve newlines
    const escapedAnswer = answer
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
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
  const matches = markdown.match(inputPattern);
  
  if (matches) {
    matches.forEach(() => gaps.push(''));
  }

  return gaps;
};

/**
 * Extract draft answers from HTML markdown with <input> or <textarea> tags
 * For <input>: extracts value attribute
 * For <textarea>: extracts content between tags
 * Returns array of draft answers in the same order as extractCorrectAnswers
 */
export const extractDraftAnswers = (markdown: string): string[] => {
  const answers: string[] = [];
  const text = markdown ?? '';
  
  // Match <input> tags with data-answer attribute (value attribute can be anywhere in the tag)
  const inputPattern = /<input[^>]*data-answer="[^"]*"[^>]*>/gi;
  let match;
  
  while ((match = inputPattern.exec(text)) !== null) {
    const fullTag = match[0];
    // Extract value attribute from the full tag (value can appear anywhere)
    const valueMatch = fullTag.match(/value="([^"]*)"/i);
    const draftValue = valueMatch ? valueMatch[1] : '';
    // Unescape HTML entities
    const answer = draftValue
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    answers.push(answer);
  }

  // Match <textarea> tags - extract content between tags
  const textareaPattern = /<textarea[^>]*data-answer="[^"]*"[^>]*>(.*?)<\/textarea>/gi;
  while ((match = textareaPattern.exec(text)) !== null) {
    const draftContent = match[1] || '';
    // Unescape HTML entities and convert <br> to newlines
    const answer = draftContent
      .replace(/<br\s*\/?>/gi, '\n')
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
 * Update markdown with draft answers by adding/updating value attributes or textarea content
 * For <input>: adds/updates value attribute
 * For <textarea>: updates content between tags
 */
export const updateMarkdownWithDraftAnswers = (
  markdown: string,
  draftAnswers: string[]
): string => {
  let result = markdown;
  let answerIndex = 0;

  // Update <input> tags with value attributes
  const inputPattern = /<input([^>]*data-answer="[^"]*"[^>]*)>/gi;
  result = result.replace(inputPattern, (match) => {
    const draftAnswer = draftAnswers[answerIndex] || '';
    answerIndex++;
    
    // Remove existing value attribute if present (value can be anywhere in the tag)
    let cleanedTag = match.replace(/\s+value="[^"]*"/gi, '');
    
    // Escape HTML entities
    const escapedAnswer = draftAnswer
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    
    // Add value attribute if draft answer is not empty
    if (draftAnswer.trim()) {
      // Insert value before the closing >
      return cleanedTag.replace(/>$/, ` value="${escapedAnswer}">`);
    } else {
      return cleanedTag;
    }
  });

  // Reset answerIndex for textarea processing
  answerIndex = 0;

  // Update <textarea> tags with content between tags
  const textareaPattern = /<textarea([^>]*data-answer="[^"]*")([^>]*)>(.*?)<\/textarea>/gi;
  result = result.replace(textareaPattern, (match, beforeDataAnswer, afterDataAnswer, oldContent) => {
    const draftAnswer = draftAnswers[answerIndex] || '';
    answerIndex++;
    
    // Escape HTML entities and convert newlines to <br>
    const escapedAnswer = draftAnswer
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
    
    return `<textarea${beforeDataAnswer}${afterDataAnswer}>${escapedAnswer}</textarea>`;
  });

  return result;
};
