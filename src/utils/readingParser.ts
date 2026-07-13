/**
 * Reading Exercise Parser
 *
 * Defines the canonical HTML contract for READING exercises and provides pure
 * build/extract helpers. A reading exercise shows the previously-read paragraph
 * (gray), the new fragment, and a list of multiple-choice questions.
 *
 * Canonical shape:
 * <div class="reading-exercise" data-book="grimm" data-start="120" data-end="128">
 *   <p class="reading-prev">…last read paragraph…</p>
 *   <div class="reading-fragment"><p>…</p>…</div>
 *   <ol class="reading-questions">
 *     <li class="reading-question" data-answer="1" data-selected="">
 *       <span class="q">…?</span>
 *       <label><input type="radio" name="q0" value="0"> Opt A</label>
 *       …
 *     </li>
 *   </ol>
 * </div>
 */

export interface ReadingQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ReadingRange {
  bookId: string;
  startIndex: number;
  endIndex: number;
}

export interface CreateReadingMarkdownInput {
  bookId: string;
  prevParagraph: string;
  fragmentParagraphs: string[];
  questions: ReadingQuestion[];
  startIndex: number;
  endIndex: number;
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const READING_CLASS = 'reading-exercise';

/**
 * True if the markdown represents a reading exercise.
 */
export const isReadingMarkdown = (markdown: string): boolean =>
  /class=["']reading-exercise["']/i.test(markdown ?? '');

/**
 * Build the canonical reading-exercise HTML.
 */
export const createReadingMarkdown = (input: CreateReadingMarkdownInput): string => {
  const { bookId, prevParagraph, fragmentParagraphs, questions, startIndex, endIndex } = input;

  const prevHtml = prevParagraph
    ? `\n  <p class="reading-prev">${escapeHtml(prevParagraph)}</p>`
    : '';

  const fragmentHtml = fragmentParagraphs
    .map((p) => `    <p>${escapeHtml(p)}</p>`)
    .join('\n');

  const questionsHtml = questions
    .map((q, qi) => {
      const optionsHtml = q.options
        .map(
          (opt, oi) =>
            `      <label><input type="radio" name="q${qi}" value="${oi}"> ${escapeHtml(opt)}</label>`
        )
        .join('\n');
      return `    <li class="reading-question" data-answer="${q.correctIndex}" data-selected="">
      <span class="q">${escapeHtml(q.question)}</span>
${optionsHtml}
    </li>`;
    })
    .join('\n');

  return `<div class="${READING_CLASS}" data-book="${escapeHtml(bookId)}" data-start="${startIndex}" data-end="${endIndex}">${prevHtml}
  <div class="reading-fragment">
${fragmentHtml}
  </div>
  <ol class="reading-questions">
${questionsHtml}
  </ol>
</div>`;
};

const parseDoc = (markdown: string): Document =>
  new DOMParser().parseFromString(markdown ?? '', 'text/html');

const getRoot = (markdown: string): Element | null =>
  parseDoc(markdown).querySelector(`.${READING_CLASS}`);

/**
 * Extract book id and paragraph range from the markdown.
 */
export const extractReadingRange = (markdown: string): ReadingRange | null => {
  const root = getRoot(markdown);
  if (!root) return null;
  return {
    bookId: root.getAttribute('data-book') || '',
    startIndex: parseInt(root.getAttribute('data-start') || '0', 10) || 0,
    endIndex: parseInt(root.getAttribute('data-end') || '0', 10) || 0,
  };
};

/**
 * Extract the previously-read paragraph (gray text), or '' if none.
 */
export const extractReadingPrev = (markdown: string): string => {
  const root = getRoot(markdown);
  return root?.querySelector('.reading-prev')?.textContent?.trim() || '';
};

/**
 * Extract the fragment paragraphs (the new text to read).
 */
export const extractReadingFragment = (markdown: string): string[] => {
  const root = getRoot(markdown);
  if (!root) return [];
  return Array.from(root.querySelectorAll('.reading-fragment p'))
    .map((p) => p.textContent?.trim() || '')
    .filter((t) => t.length > 0);
};

/**
 * Extract the questions with their options and correct index.
 */
export const extractReadingQuestions = (markdown: string): ReadingQuestion[] => {
  const root = getRoot(markdown);
  if (!root) return [];
  return Array.from(root.querySelectorAll('li.reading-question')).map((li) => {
    const question = li.querySelector('.q')?.textContent?.trim() || '';
    const options = Array.from(li.querySelectorAll('label')).map(
      (label) => label.textContent?.trim() || ''
    );
    const correctIndex = parseInt(li.getAttribute('data-answer') || '0', 10) || 0;
    return { question, options, correctIndex };
  });
};

/**
 * Read the current draft selections (selected option index per question as a string,
 * '' when unanswered). Length matches the number of questions.
 */
export const extractReadingSelections = (markdown: string): string[] => {
  const root = getRoot(markdown);
  if (!root) return [];
  return Array.from(root.querySelectorAll('li.reading-question')).map(
    (li) => li.getAttribute('data-selected') || ''
  );
};

/**
 * Persist draft selections back into the markdown (data-selected attribute per question
 * and the matching radio input's checked state), returning the updated markdown.
 */
export const updateReadingMarkdownWithSelections = (
  markdown: string,
  selections: string[]
): string => {
  const doc = parseDoc(markdown);
  const root = doc.querySelector(`.${READING_CLASS}`);
  if (!root) return markdown;

  const questions = Array.from(root.querySelectorAll('li.reading-question'));
  questions.forEach((li, index) => {
    const selection = selections[index] ?? '';
    li.setAttribute('data-selected', selection);
    li.querySelectorAll('input[type="radio"]').forEach((input) => {
      if (selection !== '' && input.getAttribute('value') === selection) {
        input.setAttribute('checked', 'checked');
      } else {
        input.removeAttribute('checked');
      }
    });
  });

  return root.outerHTML;
};
