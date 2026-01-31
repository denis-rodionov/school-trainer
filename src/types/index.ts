import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'trainer';

export type Subject = string; // Dynamic - can be any subject name

export type WorksheetStatus = 'pending' | 'completed';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
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
  status: WorksheetStatus;
  score?: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface Exercise {
  id: string;
  topicId: string;
  topicShortName: string;
  markdown: string;
  correctAnswers: string[];
  userInput?: string;
  order: number;
}
