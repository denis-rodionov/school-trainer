import {
  extractCorrectAnswers,
  extractAudioUrl,
  parseMarkdown,
  transformMarkdownWithAnswers,
  extractGaps,
  extractDraftAnswers,
  updateMarkdownWithDraftAnswers,
} from './markdownParser';
import {
  FILL_GAPS_MARKDOWN,
  MULTI_GAP_MARKDOWN,
  ESCAPED_ANSWER_MARKDOWN,
  DICTATION_MARKDOWN,
} from '../test/fixtures';

describe('markdownParser', () => {
  describe('extractCorrectAnswers', () => {
    it('extracts answers from input tags', () => {
      expect(extractCorrectAnswers(FILL_GAPS_MARKDOWN)).toEqual(['6']);
    });

    it('extracts multiple answers in order', () => {
      expect(extractCorrectAnswers(MULTI_GAP_MARKDOWN)).toEqual(['3', '4']);
    });

    it('unescapes HTML entities in answers', () => {
      expect(extractCorrectAnswers(ESCAPED_ANSWER_MARKDOWN)).toEqual(["Tom's book"]);
    });

    it('extracts textarea answers for dictation', () => {
      expect(extractCorrectAnswers(DICTATION_MARKDOWN)).toEqual(['Hello world']);
    });

    it('returns empty array for empty input', () => {
      expect(extractCorrectAnswers('')).toEqual([]);
    });
  });

  describe('extractAudioUrl', () => {
    it('extracts audio src from markdown', () => {
      expect(extractAudioUrl(DICTATION_MARKDOWN)).toBe('https://example.com/audio.mp3');
    });

    it('returns null when no audio tag', () => {
      expect(extractAudioUrl(FILL_GAPS_MARKDOWN)).toBeNull();
    });
  });

  describe('parseMarkdown', () => {
    it('parses single gap with surrounding text', () => {
      const parsed = parseMarkdown(FILL_GAPS_MARKDOWN);
      expect(parsed.correctAnswers).toEqual(['6']);
      expect(parsed.parts.filter((p) => p.isGap)).toHaveLength(1);
      expect(parsed.parts.find((p) => !p.isGap)?.text).toContain('4+2=');
    });

    it('parses multiple gaps', () => {
      const parsed = parseMarkdown(MULTI_GAP_MARKDOWN);
      expect(parsed.parts.filter((p) => p.isGap)).toHaveLength(2);
    });
  });

  describe('transformMarkdownWithAnswers', () => {
    it('replaces input tags with user answers', () => {
      const result = transformMarkdownWithAnswers(MULTI_GAP_MARKDOWN, ['3', '4']);
      expect(result).not.toMatch(/<input/);
      expect(result).toContain('3');
      expect(result).toContain('4');
    });

    it('escapes HTML in user answers', () => {
      const markdown = '<p><input data-answer="x"/></p>';
      const result = transformMarkdownWithAnswers(markdown, ['<script>']);
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('extractGaps', () => {
    it('returns empty strings for each gap', () => {
      expect(extractGaps(MULTI_GAP_MARKDOWN)).toEqual(['', '']);
    });
  });

  describe('draft answer round-trip', () => {
    const markdownWithDraft =
      '<p>4+2=<input data-answer="6" value="5"/></p>';

    it('extractDraftAnswers reads value attributes', () => {
      expect(extractDraftAnswers(markdownWithDraft)).toEqual(['5']);
    });

    it('updateMarkdownWithDraftAnswers writes value attributes', () => {
      const base = '<p>4+2=<input data-answer="6"/></p>';
      const updated = updateMarkdownWithDraftAnswers(base, ['5']);
      expect(extractDraftAnswers(updated)).toEqual(['5']);
    });

    it('clears value when draft is empty', () => {
      const updated = updateMarkdownWithDraftAnswers(markdownWithDraft, ['']);
      expect(extractDraftAnswers(updated)).toEqual(['']);
    });
  });
});
