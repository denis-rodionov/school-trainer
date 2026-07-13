export const FIRESTORE_RECOVERY_EVENT = 'firestore-recovery';

export const DEFAULT_TIMEOUT_MS = 2000;
const RETRY_DELAY_MS = 500;

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

let recoveryPromise: Promise<void> | null = null;
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

/** Pause before a timed-out read retry. Do not call enableNetwork() here — it corrupts
 *  internal watch-target state when the network was never disabled (Firebase SDK bug). */
export async function recoverFirestoreConnection(): Promise<void> {
  if (!recoveryPromise) {
    recoveryPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        recoveryPromise = null;
        resolve();
      }, RETRY_DELAY_MS);
    });
  }
  return recoveryPromise;
}

export function notifyFirestoreRecovery(): void {
  if (notifyTimer) {
    clearTimeout(notifyTimer);
  }
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    window.dispatchEvent(new CustomEvent(FIRESTORE_RECOVERY_EVENT));
  }, 150);
}

function isRecoverableFirestoreError(error: unknown): boolean {
  return error instanceof FirestoreTimeoutError;
}

export async function firestoreRead<T>(fn: () => Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  try {
    return await withTimeout(fn(), timeoutMs);
  } catch (error) {
    if (!isRecoverableFirestoreError(error)) {
      throw error;
    }
    await recoverFirestoreConnection();
    return withTimeout(fn(), timeoutMs);
  }
}
