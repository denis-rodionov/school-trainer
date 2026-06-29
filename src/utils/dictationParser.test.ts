import {
  extractAudioUrl,
  extractDictationAnswer,
  parseDictationMarkdown,
  createDictationMarkdown,
} from './dictationParser';
import { DICTATION_MARKDOWN } from '../test/fixtures';

describe('dictationParser', () => {
  describe('extractAudioUrl', () => {
    it('extracts audio URL', () => {
      expect(extractAudioUrl(DICTATION_MARKDOWN)).toBe('https://example.com/audio.mp3');
    });
  });

  describe('extractDictationAnswer', () => {
    it('extracts correct answer from textarea', () => {
      expect(extractDictationAnswer(DICTATION_MARKDOWN)).toBe('Hello world');
    });

    it('returns empty string when no textarea', () => {
      expect(extractDictationAnswer('<p>no dictation</p>')).toBe('');
    });
  });

  describe('parseDictationMarkdown', () => {
    it('parses full dictation exercise', () => {
      expect(parseDictationMarkdown(DICTATION_MARKDOWN)).toEqual({
        audioUrl: 'https://example.com/audio.mp3',
        correctAnswer: 'Hello world',
        hasTextarea: true,
      });
    });
  });

  describe('createDictationMarkdown', () => {
    it('creates markdown with audio and textarea', () => {
      const markdown = createDictationMarkdown('Hello world', 'https://example.com/a.mp3');
      expect(markdown).toContain('<audio controls src="https://example.com/a.mp3">');
      expect(markdown).toContain('data-answer="Hello world"');
      expect(extractDictationAnswer(markdown)).toBe('Hello world');
    });

    it('escapes HTML special characters in answer', () => {
      const markdown = createDictationMarkdown('Tom & Jerry', 'https://example.com/a.mp3');
      expect(markdown).toContain('data-answer="Tom &amp; Jerry"');
      expect(extractDictationAnswer(markdown)).toBe('Tom & Jerry');
    });
  });
});
