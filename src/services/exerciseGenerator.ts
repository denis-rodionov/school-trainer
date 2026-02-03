/**
 * Exercise Generator Orchestrator
 * 
 * Central service that orchestrates exercise generation based on topic type
 * Routes to appropriate generator (FILL_GAPS or DICTATION)
 */

import { Topic, Exercise, TopicType } from '../types';
import { generateExercises } from './ai';
import { generateDictationText } from './aiDictation';
import { generateAudioFromText } from './textToSpeech';

/**
 * Generate exercises for a topic based on its type
 * 
 * @param topic - Topic to generate exercises for
 * @param count - Number of exercises to generate
 * @param onProgress - Optional callback for progress updates (current, total)
 * @returns Promise resolving to array of exercises ready to be saved
 */
export const generateExerciseForTopic = async (
  topic: Topic,
  count: number,
  onProgress?: (current: number, total: number) => void
): Promise<Omit<Exercise, 'id'>[]> => {
  const topicType: TopicType = topic.type || 'FILL_GAPS';

  if (topicType === 'DICTATION') {
    return generateDictationExercises(topic, count, onProgress);
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
 * Create markdown HTML for dictation exercise
 * Includes audio player and textarea input field
 * 
 * @param correctText - The correct text that should be written
 * @param audioUrl - URL of the audio file
 * @returns HTML markdown string
 */
function createDictationMarkdown(correctText: string, audioUrl: string): string {
  // Escape HTML special characters in the correct text
  const escapedText = correctText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Create markdown with audio player and textarea
  // The textarea has data-answer attribute with the correct text for validation
  return `<div class="dictation-exercise">
  <audio controls src="${audioUrl}"></audio>
  <textarea data-answer="${escapedText}" rows="5" cols="50" placeholder="Write what you hear..."></textarea>
</div>`;
}
