import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getStudents } from '../../services/users';
import { User } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

const StudentsScreen: React.FC = () => {
  const { t } = useLanguage();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const allStudents = await getStudents();
      setStudents(allStudents);
    } catch (err: any) {
      setError(err.message || t('error.failedToLoadStudents'));
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = (studentId: string) => {
    navigate(`/students/${studentId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('students.title')}
      </Typography>
      {students.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('students.noStudents')}
        </Typography>
      ) : (
        <List>
          {students.map((student) => (
            <ListItem key={student.uid} disablePadding>
              <ListItemButton onClick={() => handleStudentClick(student.uid)}>
                <ListItemText
                  primary={student.displayName || student.email}
                  secondary={student.email}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default StudentsScreen;
