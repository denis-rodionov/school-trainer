/**
 * Reading Fragment Selection (pure)
 *
 * Deterministically picks the next paragraph-aligned fragment from a flat list of
 * paragraphs, starting at a given position. Never splits a paragraph.
 *
 * Rules:
 * - Always include at least one paragraph.
 * - Prefer more words than fewer: keep adding paragraphs while under the target.
 * - But if adding the next paragraph would push the total above target * 1.5,
 *   stop instead (prefer fewer) — unless we have no paragraph yet.
 */

export interface ReadingFragment {
  text: string; // Paragraphs joined by blank lines
  paragraphs: string[]; // The selected paragraphs
  startIndex: number; // Index of the first paragraph included
  endIndex: number; // Index of the next unread paragraph (exclusive end)
}

const OVERFLOW_FACTOR = 1.5;

export const countWords = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

/**
 * Select the next fragment starting at startIndex.
 * If startIndex is at or past the end, returns an empty fragment.
 */
export const selectFragment = (
  paragraphs: string[],
  startIndex: number,
  targetWords: number
): ReadingFragment => {
  const start = Math.max(0, startIndex);

  if (start >= paragraphs.length) {
    return { text: '', paragraphs: [], startIndex: start, endIndex: start };
  }

  const selected: string[] = [];
  let words = 0;
  let i = start;
  const maxWords = targetWords * OVERFLOW_FACTOR;

  while (i < paragraphs.length) {
    const paragraph = paragraphs[i];
    const paragraphWords = countWords(paragraph);

    if (selected.length === 0) {
      // Always take at least one paragraph.
      selected.push(paragraph);
      words += paragraphWords;
      i += 1;
      continue;
    }

    // Enough already.
    if (words >= targetWords) break;

    // Adding this paragraph would overflow beyond 1.5x the target: prefer fewer.
    if (words + paragraphWords > maxWords) break;

    selected.push(paragraph);
    words += paragraphWords;
    i += 1;
  }

  return {
    text: selected.join('\n\n'),
    paragraphs: selected,
    startIndex: start,
    endIndex: start + selected.length,
  };
};

/**
 * The paragraph immediately before startIndex (the last already-read paragraph),
 * or an empty string when there is no prior reading context.
 *
 * Skips paragraphs before bookStartParagraph so front matter is never shown as
 * "previously read" on the first fragment.
 */
export const previousParagraph = (
  paragraphs: string[],
  startIndex: number,
  bookStartParagraph: number = 0
): string => {
  const floor = Math.max(0, bookStartParagraph);
  if (startIndex <= floor || startIndex <= 0 || startIndex > paragraphs.length) return '';
  return paragraphs[startIndex - 1] ?? '';
};
