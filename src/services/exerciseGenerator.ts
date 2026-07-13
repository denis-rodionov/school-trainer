/**
 * Exercise Generator Orchestrator
 * 
 * Central service that orchestrates exercise generation based on topic type
 * Routes to appropriate generator (FILL_GAPS or DICTATION)
 */

import { Topic, Exercise, TopicType } from '../types';
import { createDictationMarkdown } from '../utils/dictationParser';
import { createReadingMarkdown } from '../utils/readingParser';
import { selectFragment, previousParagraph } from '../utils/readingFragment';
import { generateExercises } from './ai';
import { generateDictationText } from './aiDictation';
import { generateAudioFromText } from './textToSpeech';
import { generateReadingQuestions } from './aiReading';
import { downloadBook } from './bookStorage';
import { loadBookParagraphs } from './epub';

// Map subjects to language codes used for AI/TTS content.
const LANGUAGE_MAP: Record<string, string> = {
  english: 'en',
  german: 'de',
  math: 'en',
};

const languageForTopic = (topic: Topic): string =>
  LANGUAGE_MAP[topic.subject.toLowerCase()] || 'en';

/**
 * Whether a topic has enough configuration to generate exercises.
 * READING topics need a book; other types need a prompt.
 */
export const isTopicReady = (topic: Topic | undefined | null): boolean => {
  if (!topic) return false;
  if (topic.type === 'READING') return Boolean(topic.bookId);
  return Boolean(topic.prompt);
};

/** Effective READING cursor: never before topic.bookStartParagraph. */
export const readingPositionFor = (
  readingPosition: number | undefined,
  bookStartParagraph?: number
): number => {
  const start = Math.max(0, bookStartParagraph ?? 0);
  if (typeof readingPosition === 'number' && readingPosition >= start) {
    return readingPosition;
  }
  return start;
};

/**
 * Generate exercises for a topic based on its type
 * 
 * @param topic - Topic to generate exercises for
 * @param count - Number of exercises to generate
 * @param onProgress - Optional callback for progress updates (current, total)
 * @param readingPosition - READING only: paragraph index to start generating from
 * @returns Promise resolving to array of exercises ready to be saved
 */
export const generateExerciseForTopic = async (
  topic: Topic,
  count: number,
  onProgress?: (current: number, total: number) => void,
  readingPosition: number = 0
): Promise<Omit<Exercise, 'id'>[]> => {
  const topicType: TopicType = topic.type || 'FILL_GAPS';

  if (topicType === 'DICTATION') {
    return generateDictationExercises(topic, count, onProgress);
  } else if (topicType === 'READING') {
    return generateReadingExercises(topic, count, readingPosition, onProgress);
  } else {
    return generateFillGapsExercises(topic, count, onProgress);
  }
};

/**
 * Generate FILL_GAPS exercises (existing functionality)
 */
async function generateFillGapsExercises(
  topic: Topic,
  count: number,
  onProgress?: (current: number, total: number) => void
): Promise<Omit<Exercise, 'id'>[]> {
  const generatedExercises = await generateExercises(
    topic.prompt,
    topic.shortName,
    count,
    onProgress
  );

  return generatedExercises.map((generated, index) => ({
    topicId: topic.id,
    topicShortName: topic.shortName,
    markdown: generated.markdown,
    order: index,
  }));
}

/**
 * Generate DICTATION exercises
 * Flow: Generate text → Convert to audio → Create markdown with audio player and textarea
 */
async function generateDictationExercises(
  topic: Topic,
  count: number,
  onProgress?: (current: number, total: number) => void
): Promise<Omit<Exercise, 'id'>[]> {
  const exercises: Omit<Exercise, 'id'>[] = [];

  // Determine language code from topic subject
  // Map common subjects to language codes for text-to-speech
  const languageMap: Record<string, string> = {
    'english': 'en',
    'german': 'de',
    'math': 'en', // Default to English for math
  };
  // Get language code, defaulting to English
  const languageCode = languageMap[topic.subject.toLowerCase()] || 'en';

  for (let i = 1; i <= count; i++) {
    try {
      // Update progress
      if (onProgress) {
        onProgress(i - 1, count);
      }

      // Step 1: Generate plain text using AI
      const text = await generateDictationText({
        prompt: topic.prompt,
        topicName: topic.shortName,
        exerciseNumber: i,
      });

      // Step 2: Convert text to audio
      const audioUrl = await generateAudioFromText(text, languageCode);

      // Step 3: Create markdown with audio player and textarea
      // Format: <audio src="..."></audio><textarea data-answer="correct text"></textarea>
      const markdown = createDictationMarkdown(text, audioUrl);

      exercises.push({
        topicId: topic.id,
        topicShortName: topic.shortName,
        markdown,
        audioUrl,
        order: i - 1,
      });

      // Small delay to avoid rate limits
      if (i < count) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(`Failed to generate dictation exercise ${i}:`, error);
      throw new Error(`Exercise ${i} of ${count} for topic "${topic.shortName}": ${error.message}`);
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress(count, count);
  }

  return exercises;
}

/**
 * Generate READING exercises.
 * Flow: download book bytes (Firebase SDK) -> load+flatten paragraphs -> for each exercise,
 * select the next paragraph-aligned fragment from a moving cursor, generate MCQ
 * questions, and build reading markdown. Consecutive exercises advance through the book.
 */
async function generateReadingExercises(
  topic: Topic,
  count: number,
  readingPosition: number,
  onProgress?: (current: number, total: number) => void
): Promise<Omit<Exercise, 'id'>[]> {
  if (!topic.bookId) {
    throw new Error(`Reading topic "${topic.shortName}" has no book configured.`);
  }

  const targetWords = topic.fragmentWords && topic.fragmentWords > 0 ? topic.fragmentWords : 200;
  const questionCount = topic.questionCount && topic.questionCount > 0 ? topic.questionCount : 3;
  const language = languageForTopic(topic);

  const buffer = await downloadBook(topic.bookId);
  const paragraphs = await loadBookParagraphs(topic.bookId, buffer);

  const exercises: Omit<Exercise, 'id'>[] = [];
  let cursor = Math.max(0, readingPosition);

  for (let i = 1; i <= count; i++) {
    try {
      if (onProgress) {
        onProgress(i - 1, count);
      }

      if (cursor >= paragraphs.length) {
        // Reached the end of the book; stop generating further fragments.
        break;
      }

      const fragment = selectFragment(paragraphs, cursor, targetWords);
      const prev = previousParagraph(paragraphs, fragment.startIndex, topic.bookStartParagraph);

      const questions = await generateReadingQuestions({
        fragment: fragment.text,
        questionCount,
        language,
      });

      const markdown = createReadingMarkdown({
        bookId: topic.bookId,
        prevParagraph: prev,
        fragmentParagraphs: fragment.paragraphs,
        questions,
        startIndex: fragment.startIndex,
        endIndex: fragment.endIndex,
      });

      exercises.push({
        topicId: topic.id,
        topicShortName: topic.shortName,
        markdown,
        order: i - 1,
      });

      cursor = fragment.endIndex;

      if (i < count) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(`Failed to generate reading exercise ${i}:`, error);
      throw new Error(`Exercise ${i} of ${count} for topic "${topic.shortName}": ${error.message}`);
    }
  }

  if (exercises.length === 0) {
    throw new Error(`No reading content available for topic "${topic.shortName}" (end of book reached).`);
  }

  if (onProgress) {
    onProgress(count, count);
  }

  return exercises;
}
