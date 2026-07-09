import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserData } from '../services/auth';
import { User } from '../types';
import { DEFAULT_TIMEOUT_MS, firestoreRead } from '../utils/firestoreResilience';
import { useFirestoreRecovery } from '../hooks/useFirestoreRecovery';

const AUTH_BOOT_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  authError: string | null;
  refreshUserData: () => Promise<void>;
  retryAuthBoot: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
  authError: null,
  refreshUserData: async () => {},
  retryAuthBoot: () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

async function loadUserProfile(user: FirebaseUser): Promise<User | null> {
  return firestoreRead(() => getUserData(user.uid));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authRetryCount, setAuthRetryCount] = useState(0);

  useFirestoreRecovery();

  const retryAuthBoot = useCallback(() => {
    setLoading(true);
    setAuthError(null);
    setAuthRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    let authBootResolved = false;

    const finishAuthBoot = () => {
      if (!authBootResolved) {
        authBootResolved = true;
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      if (authBootResolved) {
        return;
      }

      const fallbackUser = auth.currentUser;
      if (fallbackUser) {
        authBootResolved = true;
        void (async () => {
          setCurrentUser(fallbackUser);
          setAuthError(null);
          try {
            const data = await loadUserProfile(fallbackUser);
            setUserData(data);
          } catch (error) {
            console.error('Failed to load user data after auth timeout fallback:', error);
            setUserData(null);
            setAuthError('error.connectionLost');
          } finally {
            setLoading(false);
          }
        })();
        return;
      }

      console.warn('Auth boot timed out waiting for onAuthStateChanged');
      setAuthError('error.connectionLost');
      finishAuthBoot();
    }, AUTH_BOOT_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      authBootResolved = true;
      window.clearTimeout(timeoutId);

      setCurrentUser(user);
      setAuthError(null);

      if (user) {
        try {
          const data = await loadUserProfile(user);
          setUserData(data);
        } catch (error) {
          console.error('Failed to load user data:', error);
          setUserData(null);
          setAuthError('error.connectionLost');
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [authRetryCount]);

  const refreshUserData = async () => {
    const user = currentUser ?? auth.currentUser;
    if (!user) {
      retryAuthBoot();
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const data = await loadUserProfile(user);
      setUserData(data);
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      setAuthError('error.connectionLost');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    userData,
    loading,
    authError,
    refreshUserData,
    retryAuthBoot,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
