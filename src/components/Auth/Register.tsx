import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { register } from '../../services/auth';
import { UserRole } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

const Register: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('error.passwordsDoNotMatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('error.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      await register(email, password, role, displayName || undefined);
      // Redirect based on role
      if (role === 'trainer') {
        navigate('/topics');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || t('error.failedToRegister'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            {t('auth.register')}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              fullWidth
              id="displayName"
              label={t('auth.displayNameOptional')}
              name="displayName"
              autoComplete="name"
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t('auth.emailAddress')}
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="role-label">{t('auth.role')}</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                value={role}
                label={t('auth.role')}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <MenuItem value="student">{t('auth.student')}</MenuItem>
                <MenuItem value="trainer">{t('auth.trainer')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t('auth.password')}
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label={t('auth.confirmPassword')}
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? t('auth.registering') : t('auth.register')}
            </Button>
            <Box textAlign="center">
              <Link component={RouterLink} to="/login" variant="body2">
                {t('auth.alreadyHaveAccount')}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
