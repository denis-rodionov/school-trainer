import React from 'react';

export const useAuth = jest.fn(() => ({
  currentUser: null,
  userData: null,
  loading: false,
  refreshUserData: jest.fn(),
}));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);
