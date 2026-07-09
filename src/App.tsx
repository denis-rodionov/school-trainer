import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import AppLayout from './components/Layout/AppLayout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import StudentDashboard from './components/Student/StudentDashboard';
import TopicsScreen from './components/Trainer/TopicsScreen';
import StudentsScreen from './components/Trainer/StudentsScreen';
import StudentDetail from './components/Trainer/StudentDetail';
import WorksheetScreen from './components/Worksheet/WorksheetScreen';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const AuthLoadingState: React.FC = () => {
  const { loading, authError, retryAuthBoot } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (authError) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
        px={2}
      >
        <Alert severity="error" sx={{ maxWidth: 480, width: '100%' }}>
          {t(authError)}
        </Alert>
        <Button variant="contained" onClick={retryAuthBoot}>
          {t('common.retry')}
        </Button>
      </Box>
    );
  }

  return null;
};

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('student' | 'trainer')[];
}> = ({ children, allowedRoles }) => {
  const { currentUser, userData, loading, authError } = useAuth();

  if (loading || authError) {
    return <AuthLoadingState />;
  }

  if (!currentUser || !userData) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { currentUser, userData, loading, authError } = useAuth();

  if (loading || authError) {
    return <AuthLoadingState />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          currentUser && userData ? (
            <Navigate
              to={userData.role === 'trainer' ? '/topics' : '/dashboard'}
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route element={<AppLayout />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/topics"
          element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <TopicsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students"
          element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <StudentsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/:studentId"
          element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <StudentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worksheet/:worksheetId"
          element={
            <ProtectedRoute>
              <WorksheetScreen />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <AppRoutes />
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
