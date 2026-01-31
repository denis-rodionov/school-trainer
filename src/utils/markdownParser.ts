/**
 * Parses markdown text with gaps (___) and extracts them for input fields
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
 * Parse markdown text and extract gaps
 * Pattern: ___ (three underscores)
 */
export const parseMarkdown = (markdown: string, correctAnswers: string[] = []): ParsedMarkdown => {
  const parts: ParsedGap[] = [];
  const gapPattern = /___/g;
  let lastIndex = 0;
  let gapIndex = 0;
  let match;

  while ((match = gapPattern.exec(markdown)) !== null) {
    // Add text before gap
    if (match.index > lastIndex) {
      parts.push({
        text: markdown.substring(lastIndex, match.index),
        isGap: false,
        index: parts.length,
      });
    }

    // Add gap
    parts.push({
      text: '',
      isGap: true,
      correctAnswer: correctAnswers[gapIndex],
      index: parts.length,
    });

    lastIndex = match.index + 3; // ___ is 3 characters
    gapIndex++;
  }

  // Add remaining text
  if (lastIndex < markdown.length) {
    parts.push({
      text: markdown.substring(lastIndex),
      isGap: false,
      index: parts.length,
    });
  }

  return {
    parts,
    correctAnswers,
  };
};

/**
 * Transform markdown with user answers filled in
 * Used for storing completed worksheets
 */
export const transformMarkdownWithAnswers = (
  markdown: string,
  answers: string[]
): string => {
  let result = markdown;
  let answerIndex = 0;

  result = result.replace(/___/g, () => {
    const answer = answers[answerIndex] || '';
    answerIndex++;
    return answer;
  });

  return result;
};

/**
 * Extract all gaps from markdown (returns array of empty strings for each gap)
 */
export const extractGaps = (markdown: string): string[] => {
  const gapPattern = /___/g;
  const gaps: string[] = [];
  let match;

  while ((match = gapPattern.exec(markdown)) !== null) {
    gaps.push('');
  }

  return gaps;
};
