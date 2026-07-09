import React from 'react';
import { render, screen } from '@testing-library/react';
import { useAuth } from './contexts/AuthContext';
import App from './App';

const mockUseAuth = useAuth as jest.Mock;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      userData: null,
      loading: false,
      authError: null,
      refreshUserData: jest.fn(),
      retryAuthBoot: jest.fn(),
    });
  });

  it('redirects unauthenticated user from dashboard to login', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  it('redirects trainer away from student dashboard', async () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'trainer-1' },
      userData: { uid: 'trainer-1', email: 't@test.com', role: 'trainer' },
      loading: false,
      authError: null,
      refreshUserData: jest.fn(),
      retryAuthBoot: jest.fn(),
    });
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(screen.queryByRole('heading', { name: /^dashboard$/i })).not.toBeInTheDocument();
  });

  it('redirects student away from trainer topics page', async () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'student-1' },
      userData: { uid: 'student-1', email: 's@test.com', role: 'student' },
      loading: false,
      authError: null,
      refreshUserData: jest.fn(),
      retryAuthBoot: jest.fn(),
    });
    window.history.pushState({}, '', '/topics');
    render(<App />);
    expect(screen.queryByRole('heading', { name: /^topics$/i })).not.toBeInTheDocument();
  });
});
