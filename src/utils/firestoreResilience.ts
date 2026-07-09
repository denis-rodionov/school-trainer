import { enableNetwork } from 'firebase/firestore';
import { db } from '../services/firebase';

export const FIRESTORE_RECOVERY_EVENT = 'firestore-recovery';

export const DEFAULT_TIMEOUT_MS = 4000;

export class FirestoreTimeoutError extends Error {
  constructor(message = 'Firestore operation timed out') {
    super(message);
    this.name = 'FirestoreTimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new FirestoreTimeoutError());
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function recoverFirestoreConnection(): Promise<void> {
  try {
    await enableNetwork(db);
  } catch (error) {
    console.warn('Firestore connection recovery failed:', error);
  }
}

export function notifyFirestoreRecovery(): void {
  window.dispatchEvent(new CustomEvent(FIRESTORE_RECOVERY_EVENT));
}

export async function firestoreRead<T>(fn: () => Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  try {
    return await withTimeout(fn(), timeoutMs);
  } catch (error) {
    await recoverFirestoreConnection();
    return withTimeout(fn(), timeoutMs);
  }
}
