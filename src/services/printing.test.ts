import { generatePrintHtml } from './printing';
import { sampleFillGapsExercise, sampleDictationExercise, sampleFillGapsTopic, sampleDictationTopic } from '../test/fixtures';
import { Timestamp } from 'firebase/firestore';

describe('printing', () => {
  it('generatePrintHtml includes fill-gap content', () => {
    const html = generatePrintHtml({
      worksheet: {
        id: 'ws-1',
        studentId: 'student-1',
        subject: 'math',
        status: 'pending',
        createdAt: Timestamp.now(),
      },
      exercises: [sampleFillGapsExercise],
      topicsMap: { [sampleFillGapsTopic.id]: sampleFillGapsTopic },
      translations: { title: 'Worksheet', score: 'Score', pending: 'Pending' },
    });

    expect(html).toContain('Worksheet');
    expect(html).toContain('Add numbers');
    expect(html).toContain('print-gap');
  });

  it('generatePrintHtml shows dictation indicator without correct text', () => {
    const html = generatePrintHtml({
      worksheet: {
        id: 'ws-2',
        studentId: 'student-1',
        subject: 'english',
        status: 'pending',
        createdAt: Timestamp.now(),
      },
      exercises: [sampleDictationExercise],
      topicsMap: { [sampleDictationTopic.id]: sampleDictationTopic },
      translations: { title: 'Worksheet', score: 'Score', pending: 'Pending' },
    });

    expect(html).toContain('[Audio Dictation]');
    expect(html).not.toContain('Hello world');
  });
});
