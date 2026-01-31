import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { getCompletedWorksheets } from '../../services/worksheets';
import { User, SubjectData, Worksheet, Subject } from '../../types';
import Assignments from '../Student/Assignments';
import RecentWorksheets from '../Student/RecentWorksheets';
import AssignTopicsDialog from './AssignTopicsDialog';
import { getTopics } from '../../services/topics';

const StudentDetail: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsData, setSubjectsData] = useState<Map<Subject, SubjectData>>(new Map());
  const [worksheets, setWorksheets] = useState<Map<Subject, Worksheet[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => {
    if (!studentId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get all subjects for this user
        const userSubjects = await getUserSubjects(studentId);
        setSubjects(userSubjects);

        const [studentData, completedWorksheets] = await Promise.all([
          getUser(studentId),
          getCompletedWorksheets(studentId, 10),
        ]);

        setStudent(studentData);

        if (userSubjects.length === 0) {
          setLoading(false);
          return;
        }

        // Load data for all subjects
        const subjectDataPromises = await Promise.all(
          userSubjects.map((subject) => getSubjectData(studentId, subject))
        );

        // Create maps
        const dataMap = new Map<Subject, SubjectData>();
        const worksheetsMap = new Map<Subject, Worksheet[]>();

        userSubjects.forEach((subject, index) => {
          const data = subjectDataPromises[index];
          if (data) {
            dataMap.set(subject, data);
          }
          // For now, show all worksheets for all subjects
          worksheetsMap.set(subject, completedWorksheets);
        });

        setSubjectsData(dataMap);
        setWorksheets(worksheetsMap);
      } catch (err: any) {
        setError(err.message || 'Failed to load student data');
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
        setError(err.message || 'Failed to reload data');
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
            Back
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
          Assign Topics
        </Button>
      </Box>

      {subjects.length > 0 ? (
        <>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
            {subjects.map((subject, index) => (
              <Tab 
                key={subject} 
                label={subject.charAt(0).toUpperCase() + subject.slice(1)} 
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
                subjectName={currentSubject.charAt(0).toUpperCase() + currentSubject.slice(1)} 
              />
            </Box>
          )}
        </>
      ) : (
        <Alert severity="info">
          No subjects assigned yet. Click "Assign Topics" to get started.
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
