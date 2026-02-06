import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { useAuth } from './AuthContext';
import { updateUserLanguage } from '../services/users';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { currentUser, userData, refreshUserData } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');

  // Load language from user data or default to 'en'
  useEffect(() => {
    if (userData?.language) {
      setLanguageState(userData.language);
    } else {
      setLanguageState('en');
    }
  }, [userData?.language]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    
    // Save to user profile if logged in
    if (currentUser) {
      try {
        await updateUserLanguage(currentUser.uid, lang);
        // Refresh user data to update language in AuthContext
        await refreshUserData();
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }
  };

  const t = (key: string): string => {
    return getTranslation(key, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
