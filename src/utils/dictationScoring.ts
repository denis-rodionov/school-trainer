/**
 * Dictation Scoring Utilities
 * 
 * Provides fuzzy text matching for dictation exercises
 */

/**
 * Normalize text for comparison
 * - Convert to lowercase
 * - Remove punctuation
 * - Normalize whitespace (multiple spaces → single space)
 * - Trim
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:—–\-'"`´]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Fuzzy match text comparison for dictation exercises
 * Compares student answer with correct answer using normalized text
 * 
 * @param studentAnswer - The answer provided by the student
 * @param correctAnswer - The correct answer
 * @returns true if texts match after normalization, false otherwise
 */
export const fuzzyMatchText = (studentAnswer: string, correctAnswer: string): boolean => {
  if (!studentAnswer || !correctAnswer) {
    return false;
  }

  const normalizedStudent = normalizeText(studentAnswer);
  const normalizedCorrect = normalizeText(correctAnswer);

  return normalizedStudent === normalizedCorrect;
};

/**
 * Find differences between student answer and correct answer
 * Returns an object with information about what's wrong or missing
 * 
 * @param studentAnswer - The answer provided by the student
 * @param correctAnswer - The correct answer
 * @returns Object with error information
 */
export const findTextDifferences = (
  studentAnswer: string,
  correctAnswer: string
): {
  hasErrors: boolean;
  wrongWords: string[];
  missingWords: string[];
} => {
  const normalizedStudent = normalizeText(studentAnswer);
  const normalizedCorrect = normalizeText(correctAnswer);

  if (normalizedStudent === normalizedCorrect) {
    return {
      hasErrors: false,
      wrongWords: [],
      missingWords: [],
    };
  }

  // Split into words for comparison
  const studentWords = normalizedStudent.split(/\s+/).filter(w => w.length > 0);
  const correctWords = normalizedCorrect.split(/\s+/).filter(w => w.length > 0);

  const wrongWords: string[] = [];
  const missingWords: string[] = [];

  // Find words that are in student answer but wrong
  studentWords.forEach((word, index) => {
    if (index < correctWords.length && word !== correctWords[index]) {
      wrongWords.push(word);
    }
  });

  // Find words that are missing from student answer
  correctWords.forEach((word, index) => {
    if (index >= studentWords.length || word !== studentWords[index]) {
      missingWords.push(word);
    }
  });

  return {
    hasErrors: true,
    wrongWords,
    missingWords,
  };
};

/**
 * Word-level differences for display: each item is a position where the answer is wrong.
 * - expected: the correct word
 * - actual: what the student wrote, or null if they left it missing/empty
 */
export interface WordDifference {
  expected: string;
  actual: string | null;
}

/**
 * Get word-by-word differences for showing which words were missed or written incorrectly.
 * Uses the same normalization as fuzzyMatchText.
 * Returns only positions where expected !== actual (wrong or missing).
 */
export const getWordLevelDifferences = (
  studentAnswer: string,
  correctAnswer: string
): WordDifference[] => {
  const normalizedStudent = normalizeText(studentAnswer);
  const normalizedCorrect = normalizeText(correctAnswer);

  if (normalizedStudent === normalizedCorrect) {
    return [];
  }

  const studentWords = normalizedStudent.split(/\s+/).filter(w => w.length > 0);
  const correctWords = normalizedCorrect.split(/\s+/).filter(w => w.length > 0);
  const result: WordDifference[] = [];

  const maxLen = Math.max(studentWords.length, correctWords.length);
  for (let i = 0; i < maxLen; i++) {
    const expected = correctWords[i] ?? null;
    const actual = studentWords[i] ?? null;
    if (expected == null) break; // no more correct words
    if (actual !== expected) {
      result.push({
        expected,
        actual,
      });
    }
  }

  return result;
};
