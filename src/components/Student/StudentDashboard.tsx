import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Tabs, Tab } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { getSubjectData, getUserSubjects } from '../../services/users';
import { getRecentWorksheets } from '../../services/worksheets';
import { Subject, SubjectData, Worksheet } from '../../types';
import Assignments from './Assignments';
import RecentWorksheets from './RecentWorksheets';
import { useNavigate } from 'react-router-dom';
import {
  getPendingWorksheetBySubject,
} from '../../services/worksheets';

const StudentDashboard: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsData, setSubjectsData] = useState<Map<Subject, SubjectData>>(new Map());
  const [worksheets, setWorksheets] = useState<Map<Subject, Worksheet[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (!currentUser || !userData || userData.role !== 'student') {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get all subjects for this user
        const userSubjects = await getUserSubjects(currentUser.uid);
        setSubjects(userSubjects);

        if (userSubjects.length === 0) {
          setLoading(false);
          return;
        }

        // Load data for all subjects
        const subjectDataPromises = await Promise.all(
          userSubjects.map((subject) => getSubjectData(currentUser.uid, subject))
        );

        // Load worksheets for each subject
        const worksheetsPromises = await Promise.all(
          userSubjects.map((subject) => getRecentWorksheets(currentUser.uid, subject, 10))
        );

        // Create maps
        const dataMap = new Map<Subject, SubjectData>();
        const worksheetsMap = new Map<Subject, Worksheet[]>();

        userSubjects.forEach((subject, index) => {
          const data = subjectDataPromises[index];
          if (data) {
            dataMap.set(subject, data);
          }
          worksheetsMap.set(subject, worksheetsPromises[index]);
        });

        setSubjectsData(dataMap);
        setWorksheets(worksheetsMap);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, userData]);

  const handlePractice = async (subject: Subject) => {
    if (!currentUser) return;

    try {
      // Check for pending worksheet
      const pendingWorksheet = await getPendingWorksheetBySubject(currentUser.uid, subject);
      
      if (pendingWorksheet) {
        navigate(`/worksheet/${pendingWorksheet.id}`);
        return;
      }

      // Get subject data with topic assignments
      const subjectData = await getSubjectData(currentUser.uid, subject);
      if (!subjectData || !subjectData.topicAssignments.length) {
        alert('No topics assigned for this subject. Please contact your trainer.');
        return;
      }

      // Exercises need to be created manually
      alert('Worksheet creation is not yet implemented. Exercises need to be created manually.');
      return;
    } catch (err: any) {
      alert(err.message || 'Failed to create worksheet');
    }
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

  if (subjects.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Student Dashboard
        </Typography>
        <Alert severity="info">
          No subjects assigned yet. Please contact your trainer to get started.
        </Alert>
      </Box>
    );
  }

  const currentSubject = subjects[tabValue];
  const currentSubjectData = subjectsData.get(currentSubject) || null;
  const currentWorksheets = worksheets.get(currentSubject) || [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Student Dashboard
      </Typography>

      {subjects.length > 0 && (
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
          {subjects.map((subject, index) => (
            <Tab 
              key={subject} 
              label={subject.charAt(0).toUpperCase() + subject.slice(1)} 
            />
          ))}
        </Tabs>
      )}

      {currentSubject && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Assignments Component */}
          <Assignments 
            subject={currentSubject} 
            subjectData={currentSubjectData} 
            onPractice={handlePractice}
            isReadOnly={true}
          />

          {/* Recent Worksheets Component */}
          <RecentWorksheets 
            worksheets={currentWorksheets} 
            subjectName={currentSubject.charAt(0).toUpperCase() + currentSubject.slice(1)} 
          />
        </Box>
      )}
    </Box>
  );
};

export default StudentDashboard;
