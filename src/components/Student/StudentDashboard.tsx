import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Tabs, Tab } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translateSubject } from '../../i18n/translations';
import { getSubjectData, getUserSubjects } from '../../services/users';
import { getRecentWorksheets } from '../../services/worksheets';
import { Subject, SubjectData, Worksheet } from '../../types';
import Assignments from './Assignments';
import RecentWorksheets from './RecentWorksheets';
import { useNavigate } from 'react-router-dom';
import {
  getPendingWorksheetBySubject,
} from '../../services/worksheets';

// Module-level log to verify file is loaded
console.log('StudentDashboard module loaded');

const StudentDashboard: React.FC = () => {
  console.log('=== StudentDashboard component START ===');
  
  const { currentUser, userData, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsData, setSubjectsData] = useState<Map<Subject, SubjectData>>(new Map());
  const [worksheets, setWorksheets] = useState<Map<Subject, Worksheet[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  console.log('StudentDashboard render', { 
    hasCurrentUser: !!currentUser, 
    hasUserData: !!userData, 
    authLoading, 
    role: userData?.role,
    language 
  });

  useEffect(() => {
    console.log('StudentDashboard useEffect triggered', { currentUser: !!currentUser, userData: !!userData, role: userData?.role });
    
    if (!currentUser) {
      console.log('No currentUser, setting loading to false');
      setLoading(false);
      return;
    }
    
    if (!userData) {
      console.log('No userData yet, waiting...');
      // Wait for userData to load
      return;
    }
    
    if (userData.role !== 'student') {
      console.log('Not a student, setting loading to false');
      setLoading(false);
      return;
    }

    console.log('Loading data for student...');
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
          console.log(`Subject ${subject}:`, data);
          // Always set data, even if null (to track which subjects exist)
          if (data) {
            dataMap.set(subject, data);
          }
          const worksheetsForSubject = worksheetsPromises[index] || [];
          console.log(`Worksheets for ${subject}:`, worksheetsForSubject);
          worksheetsMap.set(subject, worksheetsForSubject);
        });

        console.log('Final dataMap:', Array.from(dataMap.entries()));
        console.log('Final worksheetsMap:', Array.from(worksheetsMap.entries()));
        setSubjectsData(dataMap);
        setWorksheets(worksheetsMap);
        
        // Reset tab value if it's out of bounds
        setTabValue((prev) => prev >= userSubjects.length ? 0 : prev);
      } catch (err: any) {
        setError(err.message || t('error.failedToLoad'));
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
        alert(t('error.noAssignments'));
        return;
      }

      // Exercises need to be created manually
      alert(t('error.failedToCreateWorksheet'));
      return;
    } catch (err: any) {
      alert(err.message || t('error.failedToCreateWorksheet'));
    }
  };

  if (authLoading || loading) {
    console.log('Showing loading spinner', { authLoading, loading });
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
          {t('dashboard.studentDashboard')}
        </Typography>
        <Alert severity="info">
          {t('dashboard.noSubjectsAssigned')}
        </Alert>
      </Box>
    );
  }

  const currentSubject = subjects.length > 0 && tabValue < subjects.length ? subjects[tabValue] : null;
  const currentSubjectData = currentSubject ? (subjectsData.get(currentSubject) || null) : null;
  const currentWorksheets = currentSubject ? (worksheets.get(currentSubject) || []) : [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('dashboard.studentDashboard')}
      </Typography>

      {subjects.length > 0 && (
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
          {subjects.map((subject, index) => (
            <Tab 
              key={subject} 
              label={translateSubject(subject, language)} 
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
            subjectName={translateSubject(currentSubject, language)} 
          />
        </Box>
      )}
    </Box>
  );
};

export default StudentDashboard;
