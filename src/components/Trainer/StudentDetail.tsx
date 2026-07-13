import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { useLanguage } from '../../contexts/LanguageContext';
import { translateSubject } from '../../i18n/translations';
import { firestoreRead } from '../../utils/firestoreResilience';
import { useOnFirestoreRecovery } from '../../hooks/useFirestoreRecovery';

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
  const loadGenerationRef = useRef(0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, searchParams]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    if (studentId && newValue >= 0 && newValue < subjects.length) {
      setTabValue(newValue);
      setSearchParams({ subject: subjects[newValue] }, { replace: true });
    }
  };

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!studentId) return;

    const generation = ++loadGenerationRef.current;
    const silent = options?.silent ?? false;

    try {
      if (!silent) {
        setLoading(true);
      }
      setError('');

      const userSubjects = await firestoreRead(() => getUserSubjects(studentId));
      if (generation !== loadGenerationRef.current) return;
      setSubjects(userSubjects);

      const studentData = await firestoreRead(() => getUser(studentId));
      if (generation !== loadGenerationRef.current) return;
      setStudent(studentData);

      if (userSubjects.length === 0) {
        return;
      }

      const dataMap = new Map<Subject, SubjectData>();
      const worksheetsMap = new Map<Subject, Worksheet[]>();

      for (const subject of userSubjects) {
        const data = await firestoreRead(() => getSubjectData(studentId, subject));
        if (generation !== loadGenerationRef.current) return;
        if (data) {
          dataMap.set(subject, data);
        }

        const subjectWorksheets = await firestoreRead(() =>
          getRecentWorksheets(studentId, subject, 10)
        );
        if (generation !== loadGenerationRef.current) return;
        worksheetsMap.set(subject, subjectWorksheets);
      }

      const { calculateAndUpdateGrade, isGradeStale } = await import('../../services/gradeService');
      for (const subject of userSubjects) {
        const data = dataMap.get(subject);
        if (data && data.topicAssignments.length > 0) {
          if (isGradeStale(data.statistics.grade, data.statistics.gradeUpdatedDate)) {
            await firestoreRead(() => calculateAndUpdateGrade(studentId, subject));
            const updatedData = await firestoreRead(() => getSubjectData(studentId, subject));
            if (updatedData) {
              dataMap.set(subject, updatedData);
            }
          }
        }
        if (generation !== loadGenerationRef.current) return;
      }
      if (generation !== loadGenerationRef.current) return;

      setSubjectsData(new Map(dataMap));
      setWorksheets(worksheetsMap);
    } catch (err: any) {
      if (generation !== loadGenerationRef.current) return;
      setError(err.message || t('error.connectionLost'));
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [studentId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useOnFirestoreRecovery(() => {
    if (!loading && studentId) {
      void loadData();
    }
  });

  const handleAssignClick = () => {
    setAssignDialogOpen(true);
  };

  const handleAssignSave = () => {
    void loadData({ silent: true });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => void loadData()}>
          {t('common.retry')}
        </Button>
      </Box>
    );
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
                userIdForWorksheet={studentId ?? undefined}
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
