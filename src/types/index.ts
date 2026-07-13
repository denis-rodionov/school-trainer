import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'trainer';

export type Subject = string; // Dynamic - can be any subject name

export type WorksheetStatus = 'pending' | 'completed';

export type Language = 'en' | 'ru' | 'de';

export type TopicType = 'FILL_GAPS' | 'DICTATION' | 'READING';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  language?: Language;
  createdAt: Timestamp;
}

export interface SubjectGutscheins {
  balance: number;
  defaultWeekly: number;
  lastWeeklyRefillWeek?: string;
}

export interface SubjectData {
  subject: Subject;
  topicAssignments: TopicAssignment[];
  statistics: SubjectStatistics;
  gutscheins?: SubjectGutscheins;
}

export interface TopicAssignment {
  topicId: string;
  count: number;
  // READING only: paragraph index of the next unread paragraph in the book.
  // Advanced when a worksheet containing this topic's reading exercises is submitted.
  readingPosition?: number;
}

export interface SubjectStatistics {
  worksheetsLast7Days: number;
  lastWorksheetDate?: Timestamp;
  grade?: number; // 1-6 grade
  gradeUpdatedDate?: Timestamp;
}

export interface Topic {
  id: string;
  subject: Subject;
  shortName: string;
  taskDescription: string;
  prompt: string;
  createdAt: Timestamp;
  createdBy: string;
  defaultExerciseCount?: number;
  type?: TopicType; // Optional, defaults to 'FILL_GAPS' for backward compatibility
  // READING only configuration
  bookId?: string; // Id of the book in Firebase Storage (books/{bookId}.epub)
  questionCount?: number; // Number of multiple-choice questions per fragment
  fragmentWords?: number; // Approximate fragment length in words
  bookStartParagraph?: number; // Paragraph index where story content begins (skip title/metadata)
}

export interface Worksheet {
  id: string;
  studentId: string;
  subject: Subject;
  status: WorksheetStatus;
  score?: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface Exercise {
  id: string;
  topicId: string;
  topicShortName: string;
  markdown: string; // Contains <input> tags with data-answer attributes for correct answers, or <audio> and <textarea> for dictation
  userInput?: string; // Last incorrect attempt (null if attempt === 1, i.e., got it right on first try)
  attempt?: number; // Number of attempts before getting it right (1 = first try correct, >1 = multiple attempts)
  order: number;
  audioUrl?: string; // Optional, only for DICTATION exercises
}
