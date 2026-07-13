import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
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
  // Email/password only: omit popupRedirectResolver so Firebase never loads the
  // cross-origin __/auth/iframe. That iframe is only needed for OAuth popup/redirect
  // sign-in, and Safari/WebKit tracking prevention blocks it, causing auth to hang.
  try {
    return initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } catch {
    // Hot reload: Auth already initialized for this app instance
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  // Force long polling instead of WebChannel streaming. Safari/WebKit blocks the
  // streaming Listen/channel fetch ("access control checks"), and auto-detect does
  // not reliably fall back, causing reads to hang. Long polling uses plain requests
  // that Safari allows.
  experimentalForceLongPolling: true,
});

export default app;
