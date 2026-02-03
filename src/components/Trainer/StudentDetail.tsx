import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import { ArrowBack, Assignment } from '@mui/icons-material';
import { getUser, getSubjectData, getUserSubjects } from '../../services/users';
import { getRecentWorksheets } from '../../services/worksheets';
import { User, SubjectData, Worksheet, Subject } from '../../types';
import Assignments from '../Student/Assignments';
import RecentWorksheets from '../Student/RecentWorksheets';
import AssignTopicsDialog from './AssignTopicsDialog';
import { getTopics } from '../../services/topics';
import { useLanguage } from '../../contexts/LanguageContext';
import { translateSubject } from '../../i18n/translations';

const StudentDetail: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const [student, setStudent] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsData, setSubjectsData] = useState<Map<Subject, SubjectData>>(new Map());
  const [worksheets, setWorksheets] = useState<Map<Subject, Worksheet[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Sync tab with URL subject param (so back from worksheet restores the tab)
  useEffect(() => {
    if (subjects.length === 0) return;
    const subjectFromUrl = searchParams.get('subject');
    const index = subjectFromUrl ? subjects.indexOf(subjectFromUrl) : -1;
    if (index >= 0) {
      setTabValue(index);
    } else {
      setSearchParams({ subject: subjects[0] }, { replace: true });
      if (subjectFromUrl) setTabValue(0);
    }
  }, [subjects, searchParams]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    if (studentId && newValue >= 0 && newValue < subjects.length) {
      setTabValue(newValue);
      setSearchParams({ subject: subjects[newValue] }, { replace: true });
    }
  };

  useEffect(() => {
    if (!studentId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get all subjects for this user
        const userSubjects = await getUserSubjects(studentId);
        setSubjects(userSubjects);

        const studentData = await getUser(studentId);
        setStudent(studentData);

        if (userSubjects.length === 0) {
          setLoading(false);
          return;
        }

        // Load data for all subjects
        const subjectDataPromises = await Promise.all(
          userSubjects.map((subject) => getSubjectData(studentId, subject))
        );

        // Load worksheets for each subject
        const worksheetsPromises = await Promise.all(
          userSubjects.map((subject) => getRecentWorksheets(studentId, subject, 10))
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
        setError(err.message || t('error.failedToLoadStudentData'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  const handleAssignClick = () => {
    setAssignDialogOpen(true);
  };

  const handleAssignSave = () => {
    // Reload data
    if (!studentId) return;
    const loadData = async () => {
      try {
        const userSubjects = await getUserSubjects(studentId);
        setSubjects(userSubjects);

        if (userSubjects.length === 0) {
          return;
        }

        const subjectDataPromises = await Promise.all(
          userSubjects.map((subject) => getSubjectData(studentId, subject))
        );

        const dataMap = new Map<Subject, SubjectData>();
        userSubjects.forEach((subject, index) => {
          const data = subjectDataPromises[index];
          if (data) {
            dataMap.set(subject, data);
          }
        });

        setSubjectsData(dataMap);
      } catch (err: any) {
        setError(err.message || t('error.failedToReloadData'));
      }
    };
    loadData();
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

  const currentSubject = subjects[tabValue];
  const currentSubjectData = subjectsData.get(currentSubject) || null;
  const currentWorksheets = worksheets.get(currentSubject) || [];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/students')}
            sx={{ mr: 2 }}
          >
            {t('common.back')}
          </Button>
          <Typography variant="h4">
            {student.displayName || student.email}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Assignment />}
          onClick={handleAssignClick}
        >
          {t('studentDetail.assignTopics')}
        </Button>
      </Box>

      {subjects.length > 0 ? (
        <>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
            {subjects.map((subject, index) => (
              <Tab 
                key={subject} 
                label={translateSubject(subject, language)} 
              />
            ))}
          </Tabs>

          {currentSubject && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Assignments Component */}
              <Assignments 
                subject={currentSubject} 
                subjectData={currentSubjectData} 
                isReadOnly={false}
                studentId={studentId}
                onUpdate={handleAssignSave}
              />

              {/* Recent Worksheets Component */}
              <RecentWorksheets 
                worksheets={currentWorksheets} 
                subjectName={translateSubject(currentSubject, language)} 
              />
            </Box>
          )}
        </>
      ) : (
        <Alert severity="info">
          {t('studentDetail.noSubjectsAssigned')}
        </Alert>
      )}

      <AssignTopicsDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        onSave={handleAssignSave}
        studentId={studentId!}
      />
    </Box>
  );
};

export default StudentDetail;
