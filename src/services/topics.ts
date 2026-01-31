import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Topic, Subject } from '../types';

export const getTopics = async (): Promise<Topic[]> => {
  const topicsSnapshot = await getDocs(collection(db, 'topics'));
  return topicsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Topic));
};

export const getTopicsBySubject = async (subject: Subject): Promise<Topic[]> => {
  const q = query(collection(db, 'topics'), where('subject', '==', subject));
  const topicsSnapshot = await getDocs(q);
  return topicsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Topic));
};

export const getTopic = async (topicId: string): Promise<Topic | null> => {
  const topicDoc = await getDoc(doc(db, 'topics', topicId));
  if (!topicDoc.exists()) {
    return null;
  }
  return { id: topicDoc.id, ...topicDoc.data() } as Topic;
};

export const createTopic = async (
  topic: Omit<Topic, 'id' | 'createdAt'>
): Promise<string> => {
  const topicData = {
    ...topic,
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(collection(db, 'topics'), topicData);
  return docRef.id;
};

export const updateTopic = async (topicId: string, updates: Partial<Topic>): Promise<void> => {
  const topicRef = doc(db, 'topics', topicId);
  await updateDoc(topicRef, updates);
};

export const deleteTopic = async (topicId: string): Promise<void> => {
  await deleteDoc(doc(db, 'topics', topicId));
};
