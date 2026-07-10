import { useEffect } from 'react';
import { FIRESTORE_RECOVERY_EVENT, notifyFirestoreRecovery } from '../utils/firestoreResilience';

export function useFirestoreRecovery(): void {
  useEffect(() => {
    const handleOnline = () => {
      notifyFirestoreRecovery();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}

export function useOnFirestoreRecovery(onRecover: () => void): void {
  useEffect(() => {
    window.addEventListener(FIRESTORE_RECOVERY_EVENT, onRecover);
    return () => {
      window.removeEventListener(FIRESTORE_RECOVERY_EVENT, onRecover);
    };
  }, [onRecover]);
}
