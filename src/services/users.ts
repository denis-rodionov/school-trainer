import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, SubjectData, Subject, SubjectStatistics, TopicAssignment, Language } from '../types';

export const getUsers = async (): Promise<User[]> => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  return usersSnapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() } as User));
};

export const getStudents = async (): Promise<User[]> => {
  const q = query(collection(db, 'users'), where('role', '==', 'student'));
  const studentsSnapshot = await getDocs(q);
  return studentsSnapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() } as User));
};

export const getUser = async (uid: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    return null;
  }
  return { uid, ...userDoc.data() } as User;
};

export const getSubjectData = async (uid: string, subject: Subject): Promise<SubjectData | null> => {
  try {
    const subjectDoc = await getDoc(doc(db, 'users', uid, 'subjects', subject));
    if (!subjectDoc.exists()) {
      return null;
    }
    const data = subjectDoc.data();
    // Ensure all required fields exist with defaults
    return {
      subject: data.subject || subject,
      topicAssignments: Array.isArray(data.topicAssignments) ? data.topicAssignments : [],
      statistics: data.statistics || {
        worksheetsLast7Days: 0,
      },
    } as SubjectData;
  } catch (error) {
    console.error(`Error loading subject data for ${subject}:`, error);
    return null;
  }
};

export const setSubjectData = async (
  uid: string,
  subject: Subject,
  data: SubjectData
): Promise<void> => {
  await setDoc(doc(db, 'users', uid, 'subjects', subject), data);
};

export const updateSubjectStatistics = async (
  uid: string,
  subject: Subject,
  statistics: SubjectStatistics
): Promise<void> => {
  const subjectRef = doc(db, 'users', uid, 'subjects', subject);
  await updateDoc(subjectRef, { statistics });
};

export const updateSubjectGrade = async (
  uid: string,
  subject: Subject,
  grade: number | null,
  gradeUpdatedDate: Timestamp
): Promise<void> => {
  const subjectRef = doc(db, 'users', uid, 'subjects', subject);
  // Get current statistics to merge
  const currentDoc = await getDoc(subjectRef);
  const currentStats = currentDoc.exists() ? (currentDoc.data().statistics || {}) : {};
  const updatedStatistics = {
    ...currentStats,
    grade,
    gradeUpdatedDate,
  };
  await updateDoc(subjectRef, { statistics: updatedStatistics });
};

export const updateSubjectTopicAssignments = async (
  uid: string,
  subject: Subject,
  topicAssignments: TopicAssignment[]
): Promise<void> => {
  const subjectRef = doc(db, 'users', uid, 'subjects', subject);
  await updateDoc(subjectRef, { topicAssignments });
};

export const getUserSubjects = async (uid: string): Promise<Subject[]> => {
  const subjectsSnapshot = await getDocs(collection(db, 'users', uid, 'subjects'));
  return subjectsSnapshot.docs.map((doc) => doc.id);
};

export const updateUserLanguage = async (uid: string, language: Language): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { language });
};
