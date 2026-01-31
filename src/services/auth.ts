import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { User, UserRole } from '../types';

export const register = async (
  email: string,
  password: string,
  role: UserRole,
  displayName?: string
): Promise<FirebaseUser> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Create user document in Firestore
  const userData: Omit<User, 'uid'> = {
    email,
    role,
    displayName,
    createdAt: Timestamp.now(),
  };

  await setDoc(doc(db, 'users', user.uid), userData);

  return user;
};

export const login = async (email: string, password: string): Promise<FirebaseUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const getUserData = async (uid: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    return null;
  }
  return { uid, ...userDoc.data() } as User;
};
