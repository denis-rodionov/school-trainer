import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { logout } from '../../services/auth';
import Navigation from './Navigation';

const AppLayout: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            School Trainer
          </Typography>
          {currentUser && userData && (
            <>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {userData.displayName || userData.email} ({userData.role})
              </Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
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
