import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Worksheet, Exercise, WorksheetStatus, Subject } from '../types';

export const getWorksheet = async (worksheetId: string): Promise<Worksheet | null> => {
  const worksheetDoc = await getDoc(doc(db, 'worksheets', worksheetId));
  if (!worksheetDoc.exists()) {
    return null;
  }
  return { id: worksheetDoc.id, ...worksheetDoc.data() } as Worksheet;
};

export const getWorksheetsByStudent = async (
  studentId: string,
  status?: WorksheetStatus
): Promise<Worksheet[]> => {
  let q = query(
    collection(db, 'worksheets'),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );
  
  if (status) {
    q = query(q, where('status', '==', status));
  }
  
  const worksheetsSnapshot = await getDocs(q);
  return worksheetsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Worksheet));
};

export const getPendingWorksheetBySubject = async (
  studentId: string,
  subject: Subject
): Promise<Worksheet | null> => {
  const q = query(
    collection(db, 'worksheets'),
    where('studentId', '==', studentId),
    where('status', '==', 'pending')
  );
  
  const worksheetsSnapshot = await getDocs(q);
  const worksheets = worksheetsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Worksheet));
  
  // Check if any pending worksheet has exercises for the subject
  for (const worksheet of worksheets) {
    const exercises = await getExercises(worksheet.id);
    if (exercises.length > 0) {
      const firstExercise = await getExercise(worksheet.id, exercises[0].id);
      if (firstExercise) {
        const topic = await import('./topics').then((m) => m.getTopic(firstExercise.topicId));
        if (topic && topic.subject === subject) {
          return worksheet;
        }
      }
    }
  }
  
  return null;
};

export const getCompletedWorksheets = async (
  studentId: string,
  count: number = 10
): Promise<Worksheet[]> => {
  const q = query(
    collection(db, 'worksheets'),
    where('studentId', '==', studentId),
    where('status', '==', 'completed'),
    orderBy('completedAt', 'desc'),
    limit(count)
  );
  
  const worksheetsSnapshot = await getDocs(q);
  return worksheetsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Worksheet));
};

export const createWorksheet = async (
  studentId: string,
  exercises: Omit<Exercise, 'id'>[]
): Promise<string> => {
  const batch = writeBatch(db);
  
  // Create worksheet document
  const worksheetData = {
    studentId,
    status: 'pending' as WorksheetStatus,
    createdAt: Timestamp.now(),
  };
  
  const worksheetRef = doc(collection(db, 'worksheets'));
  batch.set(worksheetRef, worksheetData);
  
  // Create exercise documents
  exercises.forEach((exercise, index) => {
    const exerciseRef = doc(collection(db, 'worksheets', worksheetRef.id, 'exercises'));
    batch.set(exerciseRef, {
      ...exercise,
      order: index,
    });
  });
  
  await batch.commit();
  return worksheetRef.id;
};

export const updateWorksheet = async (
  worksheetId: string,
  updates: Partial<Worksheet>
): Promise<void> => {
  const worksheetRef = doc(db, 'worksheets', worksheetId);
  await updateDoc(worksheetRef, updates);
};

export const completeWorksheet = async (
  worksheetId: string,
  score: number,
  userInputs: string[]
): Promise<void> => {
  const batch = writeBatch(db);
  
  // Update worksheet
  const worksheetRef = doc(db, 'worksheets', worksheetId);
  batch.update(worksheetRef, {
    status: 'completed',
    score,
    completedAt: Timestamp.now(),
  });
  
  // Update exercises with user inputs
  const exercises = await getExercises(worksheetId);
  exercises.forEach((exercise, index) => {
    if (userInputs[index]) {
      const exerciseRef = doc(db, 'worksheets', worksheetId, 'exercises', exercise.id);
      batch.update(exerciseRef, {
        userInput: userInputs[index],
      });
    }
  });
  
  await batch.commit();
};

export const getExercises = async (worksheetId: string): Promise<Exercise[]> => {
  const exercisesSnapshot = await getDocs(
    collection(db, 'worksheets', worksheetId, 'exercises')
  );
  const exercises = exercisesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Exercise[];
  return exercises.sort((a, b) => a.order - b.order);
};

export const getExercise = async (worksheetId: string, exerciseId: string): Promise<Exercise | null> => {
  const exerciseDoc = await getDoc(doc(db, 'worksheets', worksheetId, 'exercises', exerciseId));
  if (!exerciseDoc.exists()) {
    return null;
  }
  return { id: exerciseDoc.id, ...exerciseDoc.data() } as Exercise;
};
