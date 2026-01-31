import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Snackbar,
  Alert,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { SubjectData, Subject, Topic, Exercise } from '../../types';
import { getTopic } from '../../services/topics';
import { formatWorksheetDate } from '../../utils/dateUtils';
import { updateSubjectTopicAssignments } from '../../services/users';
import { createWorksheet, getPendingWorksheetBySubject } from '../../services/worksheets';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { extractGaps } from '../../utils/markdownParser';

interface AssignmentsProps {
  subject: Subject;
  subjectData: SubjectData | null;
  onPractice?: (subject: Subject) => void;
  isReadOnly?: boolean;
  studentId?: string; // Required when isReadOnly is false (trainer editing)
  onUpdate?: () => void; // Callback to refresh parent data after update
}

const Assignments: React.FC<AssignmentsProps> = ({ 
  subject, 
  subjectData, 
  onPractice,
  isReadOnly = false,
  studentId: propStudentId,
  onUpdate,
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Map<string, Topic>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatingWorksheet, setGeneratingWorksheet] = useState(false);
  const subjectName = subject.charAt(0).toUpperCase() + subject.slice(1);

  useEffect(() => {
    const loadTopics = async () => {
      if (!subjectData || !subjectData.topicAssignments.length) {
        setLoading(false);
        return;
      }

      try {
        const topicPromises = subjectData.topicAssignments.map((assignment) =>
          getTopic(assignment.topicId)
        );
        const loadedTopics = await Promise.all(topicPromises);
        const topicMap = new Map<string, Topic>();

        loadedTopics.forEach((topic, index) => {
          if (topic) {
            topicMap.set(subjectData.topicAssignments[index].topicId, topic);
          }
        });

        setTopics(topicMap);
      } catch (err) {
        console.error('Failed to load topics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, [subjectData]);

  const handlePractice = async () => {
    if (!currentUser || !subjectData || !subjectData.topicAssignments.length) {
      return;
    }

    try {
      setGeneratingWorksheet(true);

      // Check for pending worksheet
      const pendingWorksheet = await getPendingWorksheetBySubject(currentUser.uid, subject);
      
      if (pendingWorksheet) {
        navigate(`/worksheet/${pendingWorksheet.id}`);
        return;
      }

      // Create exercises from topic assignments
      const exercises: Omit<Exercise, 'id'>[] = [];
      let exerciseOrder = 0;

      for (const assignment of subjectData.topicAssignments) {
        const topic = topics.get(assignment.topicId);
        if (!topic) continue;

        // For each assignment, create the specified number of exercises
        // Since exercises need to be created manually, we'll create placeholder exercises
        // The trainer will need to manually create exercises with proper markdown and gaps
        for (let i = 0; i < assignment.count; i++) {
          // Create a simple placeholder exercise
          // In a real implementation, this would use AI to generate from the topic's prompt
          // For now, create a basic template that trainers can edit
          const placeholderMarkdown = `${topic.taskDescription}\n\nExercise ${i + 1}: Please fill in the blank: ___`;
          const gaps = extractGaps(placeholderMarkdown);
          
          exercises.push({
            topicId: topic.id,
            topicShortName: topic.shortName,
            markdown: placeholderMarkdown,
            correctAnswers: gaps.length > 0 ? gaps : ['answer'],
            order: exerciseOrder++,
          });
        }
      }

      if (exercises.length === 0) {
        alert('No exercises could be generated. Please contact your trainer.');
        return;
      }

      // Create worksheet
      const worksheetId = await createWorksheet(currentUser.uid, subject, exercises);
      
      // Navigate to worksheet page
      navigate(`/worksheet/${worksheetId}`);
    } catch (err: any) {
      console.error('Failed to create worksheet:', err);
      alert(err.message || 'Failed to create worksheet');
    } finally {
      setGeneratingWorksheet(false);
    }
  };

  if (loading) {
    return (
      <Card
        elevation={3}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="body2">Loading assignments...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!subjectData || !subjectData.topicAssignments.length) {
    return (
      <Card
        elevation={3}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              mb: 2,
              pb: 1.5,
              borderBottom: '2px solid',
              borderColor: 'error.main',
            }}
          >
            Assignments - {subjectName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No topics assigned yet
          </Typography>
          {onPractice && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => onPractice(subject)}
              sx={{
                mt: 2,
                py: 1.5,
                px: 4,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Practice
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={3}
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            mb: 2,
            pb: 1.5,
            borderBottom: '2px solid',
            borderColor: 'error.main',
          }}
        >
          Assignments - {subjectName}
        </Typography>

        {subjectData && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Worksheets completed in last 7 days: {subjectData.statistics.worksheetsLast7Days}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last worksheet: {formatWorksheetDate(subjectData.statistics.lastWorksheetDate)}
            </Typography>
          </Box>
        )}

        <List sx={{ pt: 1 }}>
          {subjectData.topicAssignments.map((assignment) => {
            const topic = topics.get(assignment.topicId);
            const handleCountChange = async (newCount: number) => {
              if (!propStudentId || isReadOnly) return;
              
              setSaving(true);
              try {
                const updatedAssignments = subjectData.topicAssignments.map(a =>
                  a.topicId === assignment.topicId ? { ...a, count: newCount } : a
                );
                await updateSubjectTopicAssignments(propStudentId, subject, updatedAssignments);
                setSaveSuccess(true);
                // Trigger parent to reload data
                if (onUpdate) {
                  onUpdate();
                }
              } catch (err: any) {
                console.error('Failed to update assignment:', err);
                alert(err.message || 'Failed to update assignment');
              } finally {
                setSaving(false);
              }
            };

            const handleDelete = async () => {
              if (!propStudentId || isReadOnly) return;
              
              if (!window.confirm(`Are you sure you want to remove "${topic?.shortName || 'this topic'}" from assignments?`)) {
                return;
              }
              
              setSaving(true);
              try {
                const updatedAssignments = subjectData.topicAssignments.filter(
                  a => a.topicId !== assignment.topicId
                );
                await updateSubjectTopicAssignments(propStudentId, subject, updatedAssignments);
                setSaveSuccess(true);
                // Trigger parent to reload data
                if (onUpdate) {
                  onUpdate();
                }
              } catch (err: any) {
                console.error('Failed to delete assignment:', err);
                alert(err.message || 'Failed to delete assignment');
              } finally {
                setSaving(false);
              }
            };

            return (
              <ListItem
                key={assignment.topicId}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: 'background.default',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ListItemText
                  primary={topic?.shortName || `Topic ${assignment.topicId}`}
                  secondary={topic?.taskDescription || 'No description'}
                  sx={{ flex: 1 }}
                />
                <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ minWidth: 120 }}>
                    {isReadOnly ? (
                      <Typography variant="body2" color="text.secondary">
                        {assignment.count} exercises
                      </Typography>
                    ) : (
                      <FormControl size="small" fullWidth>
                        <InputLabel>Exercises</InputLabel>
                        <Select
                          value={assignment.count}
                          label="Exercises"
                          onChange={(e) => handleCountChange(Number(e.target.value))}
                          disabled={saving}
                        >
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                            <MenuItem key={num} value={num}>
                              {num}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                  {!isReadOnly && (
                    <IconButton
                      onClick={handleDelete}
                      color="error"
                      size="small"
                      disabled={saving}
                      sx={{ flexShrink: 0 }}
                    >
                      <Delete />
                    </IconButton>
                  )}
                </Box>
              </ListItem>
            );
          })}
        </List>

        {onPractice && (
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handlePractice}
              disabled={generatingWorksheet}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2,
              }}
              startIcon={generatingWorksheet ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {generatingWorksheet ? 'Generating...' : 'Practice'}
            </Button>
          </Box>
        )}
      </CardContent>
      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSaveSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Assignment updated successfully!
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default Assignments;
