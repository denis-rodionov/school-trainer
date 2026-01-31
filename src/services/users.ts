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
import { User, SubjectData, Subject, SubjectStatistics, TopicAssignment } from '../types';

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
  const subjectDoc = await getDoc(doc(db, 'users', uid, 'subjects', subject));
  if (!subjectDoc.exists()) {
    return null;
  }
  return { ...subjectDoc.data() } as SubjectData;
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
