import React from 'react';
import { render, screen } from '@testing-library/react';
import { useAuth } from './contexts/AuthContext';
import App from './App';

const mockUseAuth = useAuth as jest.Mock;

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    currentUser: null,
    userData: null,
    loading: false,
    refreshUserData: jest.fn(),
  });
});

test('redirects unauthenticated user to login page', async () => {
  window.history.pushState({}, '', '/login');
  render(<App />);

  expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
});
