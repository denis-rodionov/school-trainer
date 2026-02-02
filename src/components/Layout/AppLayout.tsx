import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { logout } from '../../services/auth';
import { Language } from '../../types';
import Navigation from './Navigation';

const AppLayout: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLanguageChange = async (event: any) => {
    const newLanguage = event.target.value as Language;
    await setLanguage(newLanguage);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('app.title')}
          </Typography>
          {currentUser && (
            <>
              <FormControl size="small" sx={{ minWidth: 100, mr: 2 }}>
                <Select
                  value={language}
                  onChange={handleLanguageChange}
                  sx={{
                    color: 'inherit',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'inherit',
                    },
                  }}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="ru">Русский</MenuItem>
                  <MenuItem value="de">Deutsch</MenuItem>
                </Select>
              </FormControl>
              {userData && (
                <Typography variant="body2" sx={{ mr: 2 }}>
                  {userData.displayName || userData.email} ({userData.role})
                </Typography>
              )}
              <Button color="inherit" onClick={handleLogout}>
                {t('app.logout')}
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Navigation />
        <Outlet />
      </Container>
    </Box>
  );
};

export default AppLayout;
