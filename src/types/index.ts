import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'trainer';

export type Subject = string; // Dynamic - can be any subject name

export type WorksheetStatus = 'pending' | 'completed';

export type Language = 'en' | 'ru' | 'de';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  language?: Language;
  createdAt: Timestamp;
}

export interface SubjectData {
  subject: Subject;
  topicAssignments: TopicAssignment[];
  statistics: SubjectStatistics;
}

export interface TopicAssignment {
  topicId: string;
  count: number;
}

export interface SubjectStatistics {
  worksheetsLast7Days: number;
  lastWorksheetDate?: Timestamp;
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
  markdown: string; // Contains <input> tags with data-answer attributes for correct answers
  userInput?: string; // Last incorrect attempt (null if attempt === 1, i.e., got it right on first try)
  attempt?: number; // Number of attempts before getting it right (1 = first try correct, >1 = multiple attempts)
  order: number;
}
