import { Exercise, Topic } from '../types';

export const FILL_GAPS_MARKDOWN =
  '<p>4+2=<input data-answer="6"/></p>';

export const MULTI_GAP_MARKDOWN =
  '<p>5 + <input data-answer="3"/> = 8 and 2 * <input data-answer="4"/> = 8</p>';

export const ESCAPED_ANSWER_MARKDOWN =
  '<p>Quote: <input data-answer="Tom&apos;s book"/></p>';

export const DICTATION_MARKDOWN = `<div class="dictation-exercise">
  <audio controls src="https://example.com/audio.mp3"></audio>
  <textarea data-answer="Hello world" rows="5" cols="50"></textarea>
</div>`;

export const sampleFillGapsExercise: Exercise = {
  id: 'ex-1',
  topicId: 'topic-1',
  topicShortName: 'Addition',
  markdown: FILL_GAPS_MARKDOWN,
  order: 0,
};

export const sampleMultiGapExercise: Exercise = {
  id: 'ex-2',
  topicId: 'topic-1',
  topicShortName: 'Addition',
  markdown: MULTI_GAP_MARKDOWN,
  order: 1,
};

export const sampleDictationExercise: Exercise = {
  id: 'ex-3',
  topicId: 'topic-2',
  topicShortName: 'Dictation',
  markdown: DICTATION_MARKDOWN,
  audioUrl: 'https://example.com/audio.mp3',
  order: 0,
};

export const sampleFillGapsTopic: Topic = {
  id: 'topic-1',
  subject: 'math',
  shortName: 'Addition',
  taskDescription: 'Add numbers',
  prompt: 'Generate addition exercises',
  createdAt: { seconds: 0, nanoseconds: 0 } as Topic['createdAt'],
  createdBy: 'trainer-1',
  defaultExerciseCount: 5,
  type: 'FILL_GAPS',
};

export const sampleDictationTopic: Topic = {
  id: 'topic-2',
  subject: 'english',
  shortName: 'Spelling',
  taskDescription: 'Write what you hear',
  prompt: 'Generate dictation sentences',
  createdAt: { seconds: 0, nanoseconds: 0 } as Topic['createdAt'],
  createdBy: 'trainer-1',
  defaultExerciseCount: 3,
  type: 'DICTATION',
};
