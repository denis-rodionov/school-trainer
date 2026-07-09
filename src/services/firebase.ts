import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

function createAuth() {
  try {
    return initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    // Hot reload: Auth already initialized for this app instance
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalAutoDetectLongPolling: true,
});

export default app;
