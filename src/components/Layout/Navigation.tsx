import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Tab } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const { t } = useLanguage();

  if (!userData) {
    return null;
  }

  const getTabValue = () => {
    if (location.pathname.startsWith('/topics')) return 0;
    if (location.pathname.startsWith('/students')) return 1;
    if (location.pathname.startsWith('/dashboard')) return 2;
    return false;
  };

  if (userData.role === 'trainer') {
    return (
      <Tabs
        value={getTabValue()}
        onChange={(_, newValue) => {
          if (newValue === 0) navigate('/topics');
          if (newValue === 1) navigate('/students');
        }}
        sx={{ mb: 3 }}
      >
        <Tab label={t('nav.topics')} />
        <Tab label={t('nav.students')} />
      </Tabs>
    );
  }

  return null;
};

export default Navigation;
