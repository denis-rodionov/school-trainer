import { useEffect } from 'react';
import {
  FIRESTORE_RECOVERY_EVENT,
  notifyFirestoreRecovery,
  recoverFirestoreConnection,
} from '../utils/firestoreResilience';

function scheduleFirestoreRecovery(): void {
  void recoverFirestoreConnection().then(() => {
    notifyFirestoreRecovery();
  });
}

export function useFirestoreRecovery(): void {
  useEffect(() => {
    let visibilityRecoveryTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      if (visibilityRecoveryTimer) {
        clearTimeout(visibilityRecoveryTimer);
      }
      visibilityRecoveryTimer = setTimeout(() => {
        visibilityRecoveryTimer = null;
        scheduleFirestoreRecovery();
      }, 300);
    };

    const handleOnline = () => {
      scheduleFirestoreRecovery();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      if (visibilityRecoveryTimer) {
        clearTimeout(visibilityRecoveryTimer);
      }
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
