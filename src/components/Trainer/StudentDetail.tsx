import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { getUser, getSubjectData } from '../../services/users';
import { getCompletedWorksheets } from '../../services/worksheets';
import { User, SubjectData, Worksheet } from '../../types';
import SubjectBlock from '../Student/SubjectBlock';

const StudentDetail: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<User | null>(null);
  const [mathData, setMathData] = useState<SubjectData | null>(null);
  const [germanData, setGermanData] = useState<SubjectData | null>(null);
  const [mathWorksheets, setMathWorksheets] = useState<Worksheet[]>([]);
  const [germanWorksheets, setGermanWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [studentData, mathSubjectData, germanSubjectData, completedWorksheets] =
          await Promise.all([
            getUser(studentId),
            getSubjectData(studentId, 'math'),
            getSubjectData(studentId, 'german'),
            getCompletedWorksheets(studentId, 10),
          ]);

        setStudent(studentData);
        setMathData(mathSubjectData);
        setGermanData(germanSubjectData);
        // Show all worksheets for both subjects (simplified)
        setMathWorksheets(completedWorksheets);
        setGermanWorksheets(completedWorksheets);
      } catch (err: any) {
        setError(err.message || 'Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  const handlePractice = () => {
    // Practice button is disabled for trainers, but we can show a message
    alert('Trainers cannot practice. This is a read-only view.');
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

  if (!student) {
    return <Alert severity="error">Student not found</Alert>;
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/students')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4">
          {student.displayName || student.email}
        </Typography>
      </Box>

      <SubjectBlock
        subject="math"
        subjectData={mathData}
        worksheets={mathWorksheets}
        onPractice={handlePractice}
        isReadOnly={true}
      />
      <SubjectBlock
        subject="german"
        subjectData={germanData}
        worksheets={germanWorksheets}
        onPractice={handlePractice}
        isReadOnly={true}
      />
    </Box>
  );
};

export default StudentDetail;
