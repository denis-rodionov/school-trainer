/**
 * Dictation Scoring Utilities
 *
 * Provides fuzzy text matching and word-aligned diffing for dictation exercises.
 */

const GERMAN_CHAR_FOLDS: Array<[string, string]> = [
  ['ä', 'ae'],
  ['Ä', 'Ae'],
  ['ö', 'oe'],
  ['Ö', 'Oe'],
  ['ü', 'ue'],
  ['Ü', 'Ue'],
  ['ß', 'ss'],
  ['ẞ', 'SS'],
];

type AlignmentOp =
  | { type: 'match'; student: string; correct: string }
  | { type: 'substitute'; student: string; correct: string }
  | { type: 'insert'; student: string }
  | { type: 'delete'; correct: string };

function foldGermanChars(text: string): string {
  return GERMAN_CHAR_FOLDS.reduce(
    (result, [from, to]) => result.replaceAll(from, to),
    text
  );
}

/**
 * Normalize text for dictation comparison.
 * - Preserves letter case (important for German nouns and sentence starts)
 * - Unicode NFC
 * - German umlauts / eszett → ae/oe/ue/ss (case-preserving)
 * - Strip remaining diacritics (café → cafe)
 * - Remove punctuation (including curly quotes)
 * - Collapse whitespace
 */
export function normalizeText(text: string): string {
  return foldGermanChars(text)
    .normalize('NFC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .replace(/\p{P}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(/\s+/).filter((word) => word.length > 0);
}

/**
 * Whether two words count as the same after dictation normalization.
 * Accepts German spelling variants (ä/ae, ß/ss) but not typos or case differences.
 */
export function wordsEquivalent(studentWord: string, correctWord: string): boolean {
  return normalizeText(studentWord) === normalizeText(correctWord);
}

function alignWords(studentWords: string[], correctWords: string[]): AlignmentOp[] {
  const studentCount = studentWords.length;
  const correctCount = correctWords.length;
  const costs = Array.from({ length: studentCount + 1 }, () =>
    Array<number>(correctCount + 1).fill(0)
  );
  const backtrack = Array.from({ length: studentCount + 1 }, () =>
    Array<'match' | 'substitute' | 'insert' | 'delete' | 'start'>(correctCount + 1).fill('start')
  );

  for (let i = 1; i <= studentCount; i++) {
    costs[i][0] = i;
    backtrack[i][0] = 'insert';
  }
  for (let j = 1; j <= correctCount; j++) {
    costs[0][j] = j;
    backtrack[0][j] = 'delete';
  }

  for (let i = 1; i <= studentCount; i++) {
    for (let j = 1; j <= correctCount; j++) {
      const studentWord = studentWords[i - 1];
      const correctWord = correctWords[j - 1];
      const equivalent = wordsEquivalent(studentWord, correctWord);

      const matchCost = costs[i - 1][j - 1] + (equivalent ? 0 : 1);
      const insertCost = costs[i - 1][j] + 1;
      const deleteCost = costs[i][j - 1] + 1;

      let bestCost = matchCost;
      let move: AlignmentOp['type'] = equivalent ? 'match' : 'substitute';

      if (insertCost < bestCost) {
        bestCost = insertCost;
        move = 'insert';
      }
      if (deleteCost < bestCost) {
        bestCost = deleteCost;
        move = 'delete';
      }

      costs[i][j] = bestCost;
      backtrack[i][j] = move;
    }
  }

  const ops: AlignmentOp[] = [];
  let i = studentCount;
  let j = correctCount;

  while (i > 0 || j > 0) {
    const move = backtrack[i][j];

    if (move === 'match' || move === 'substitute') {
      const studentWord = studentWords[i - 1];
      const correctWord = correctWords[j - 1];
      ops.push(
        wordsEquivalent(studentWord, correctWord)
          ? { type: 'match', student: studentWord, correct: correctWord }
          : { type: 'substitute', student: studentWord, correct: correctWord }
      );
      i -= 1;
      j -= 1;
      continue;
    }

    if (move === 'insert') {
      ops.push({ type: 'insert', student: studentWords[i - 1] });
      i -= 1;
      continue;
    }

    if (move === 'delete') {
      ops.push({ type: 'delete', correct: correctWords[j - 1] });
      j -= 1;
      continue;
    }

    break;
  }

  return ops.reverse();
}

/**
 * Fuzzy match text comparison for dictation exercises.
 * Compares aligned words after normalization (case-sensitive).
 */
export const fuzzyMatchText = (studentAnswer: string, correctAnswer: string): boolean => {
  if (!studentAnswer?.trim() || !correctAnswer?.trim()) {
    return false;
  }

  const normalizedStudent = normalizeText(studentAnswer);
  const normalizedCorrect = normalizeText(correctAnswer);

  if (normalizedStudent === normalizedCorrect) {
    return true;
  }

  const alignment = alignWords(tokenize(studentAnswer), tokenize(correctAnswer));
  return alignment.every((op) => op.type === 'match');
};

/**
 * Find differences between student answer and correct answer.
 */
export const findTextDifferences = (
  studentAnswer: string,
  correctAnswer: string
): {
  hasErrors: boolean;
  wrongWords: string[];
  missingWords: string[];
} => {
  if (fuzzyMatchText(studentAnswer, correctAnswer)) {
    return {
      hasErrors: false,
      wrongWords: [],
      missingWords: [],
    };
  }

  const wrongWords: string[] = [];
  const missingWords: string[] = [];

  for (const op of alignWords(tokenize(studentAnswer), tokenize(correctAnswer))) {
    if (op.type === 'substitute') {
      wrongWords.push(op.student);
    } else if (op.type === 'insert') {
      wrongWords.push(op.student);
    } else if (op.type === 'delete') {
      missingWords.push(op.correct);
    }
  }

  return {
    hasErrors: true,
    wrongWords,
    missingWords,
  };
};

/**
 * Word-level differences for display.
 * - expected: correct word, or null when the student added an extra word
 * - actual: student's word, or null when the word is missing
 */
export interface WordDifference {
  expected: string | null;
  actual: string | null;
}

/**
 * Get word-by-word differences using aligned comparison (no index cascade).
 */
export const getWordLevelDifferences = (
  studentAnswer: string,
  correctAnswer: string
): WordDifference[] => {
  if (fuzzyMatchText(studentAnswer, correctAnswer)) {
    return [];
  }

  const result: WordDifference[] = [];

  for (const op of alignWords(tokenize(studentAnswer), tokenize(correctAnswer))) {
    if (op.type === 'substitute') {
      result.push({ expected: op.correct, actual: op.student });
    } else if (op.type === 'delete') {
      result.push({ expected: op.correct, actual: null });
    } else if (op.type === 'insert') {
      result.push({ expected: null, actual: op.student });
    }
  }

  return result;
};
