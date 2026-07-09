import { useEffect } from 'react';
import {
  FIRESTORE_RECOVERY_EVENT,
  notifyFirestoreRecovery,
  recoverFirestoreConnection,
} from '../utils/firestoreResilience';

export function useFirestoreRecovery(): void {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void recoverFirestoreConnection().then(() => {
          notifyFirestoreRecovery();
        });
      }
    };

    const handleOnline = () => {
      void recoverFirestoreConnection().then(() => {
        notifyFirestoreRecovery();
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
