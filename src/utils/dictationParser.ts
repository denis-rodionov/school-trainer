/**
 * Dictation Exercise Parser
 * 
 * Parses markdown for dictation exercises containing audio players and textarea inputs
 */

export interface DictationExercise {
  audioUrl: string | null;
  correctAnswer: string;
  hasTextarea: boolean;
}

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
 * Extract correct answer from textarea data-answer attribute
 * Looks for <textarea data-answer="..."> tags
 */
export const extractDictationAnswer = (markdown: string): string => {
  const text = markdown ?? '';
  const textareaPattern = /<textarea[^>]*data-answer=["']([^"']+)["'][^>]*>/i;
  const match = text.match(textareaPattern);
  if (!match) {
    return '';
  }
  
  // Unescape HTML entities
  const answer = match[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  return answer;
};

/**
 * Parse dictation exercise markdown
 * Extracts audio URL and correct answer text
 */
export const parseDictationMarkdown = (markdown: string): DictationExercise => {
  const text = markdown ?? '';
  const audioUrl = extractAudioUrl(text);
  const correctAnswer = extractDictationAnswer(text);
  const hasTextarea = /<textarea/i.test(text);

  return {
    audioUrl,
    correctAnswer,
    hasTextarea,
  };
};
