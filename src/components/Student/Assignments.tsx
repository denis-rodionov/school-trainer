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
  LinearProgress,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { SubjectData, Subject, Topic, Exercise } from '../../types';
import { getTopic } from '../../services/topics';
import { updateSubjectTopicAssignments } from '../../services/users';
import { createWorksheet, getPendingWorksheetBySubject } from '../../services/worksheets';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translateSubject } from '../../i18n/translations';
import { generateExerciseForTopic } from '../../services/exerciseGenerator';

interface AssignmentsProps {
  subject: Subject;
  subjectData: SubjectData | null;
  onPractice?: (subject: Subject) => void;
  isReadOnly?: boolean;
  studentId?: string; // Required when isReadOnly is false (trainer editing)
  onUpdate?: () => void; // Callback to refresh parent data after update
  /** When set (trainer view), worksheet is generated for this user and button label is "Generate" */
  userIdForWorksheet?: string;
}

const Assignments: React.FC<AssignmentsProps> = ({ 
  subject, 
  subjectData, 
  onPractice,
  isReadOnly = false,
  studentId: propStudentId,
  onUpdate,
  userIdForWorksheet,
}) => {
  const { currentUser } = useAuth();
  const targetUserId = userIdForWorksheet ?? currentUser?.uid;
  const isGenerateMode = Boolean(userIdForWorksheet);
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Map<string, Topic>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatingWorksheet, setGeneratingWorksheet] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const subjectName = translateSubject(subject, language);

  useEffect(() => {
    const loadTopics = async () => {
      if (!subjectData || !subjectData.topicAssignments || !subjectData.topicAssignments.length) {
        setTopics(new Map());
        setLoading(false);
        return;
      }

      setLoading(true);
      setTopics(new Map()); // Clear previous tab's topics so we don't show old names with new IDs
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
    if (!targetUserId || !subjectData || !subjectData.topicAssignments || !subjectData.topicAssignments.length) {
      return;
    }

    try {
      setGeneratingWorksheet(true);

      // Check for pending worksheet (for target user: student or self)
      const pendingWorksheet = await getPendingWorksheetBySubject(targetUserId, subject);
      
      if (pendingWorksheet) {
        navigate(`/worksheet/${pendingWorksheet.id}`);
        return;
      }

      // Calculate total number of exercises to generate
      const totalExercises = subjectData.topicAssignments.reduce((sum, assignment) => {
        const topic = topics.get(assignment.topicId);
        return topic && topic.prompt ? sum + assignment.count : sum;
      }, 0);

      // Create exercises from topic assignments using AI generation
      const exercises: Omit<Exercise, 'id'>[] = [];
      let exerciseOrder = 0;
      let currentExerciseIndex = 0;

      for (const assignment of subjectData.topicAssignments) {
        const topic = topics.get(assignment.topicId);
        if (!topic || !topic.prompt) continue;

        try {
          // Generate exercises using the orchestrator (handles both FILL_GAPS and DICTATION)
          const generatedExercises = await generateExerciseForTopic(
            topic,
            assignment.count,
            (current, total) => {
              // Update progress: currentExerciseIndex + current exercises completed for this topic
              setGenerationProgress({
                current: currentExerciseIndex + current,
                total: totalExercises,
              });
            }
          );

          // Add generated exercises (already in correct format)
          generatedExercises.forEach((exercise) => {
            exercises.push({
              ...exercise,
              order: exerciseOrder++,
            });
          });
          
          // Update current exercise index after completing this topic
          currentExerciseIndex += assignment.count;
        } catch (error: any) {
          console.error(`Failed to generate exercises for topic ${topic.shortName}:`, error);
          
          // Show detailed error message to user
          const errorMessage = error.message || t('error.unknownError');
          setAiError(`${t('error.failedToGenerate')} "${topic.shortName}": ${errorMessage}`);
          
          // Don't create placeholder exercises - let user know there's an issue
          // They can try again or contact their trainer
          throw error; // Re-throw to stop worksheet creation
        }
      }

      if (exercises.length === 0) {
        setAiError(t('error.noExercisesGenerated'));
        return;
      }

      // Create worksheet for target user (student when trainer generates, else current user)
      const worksheetId = await createWorksheet(targetUserId, subject, exercises);
      
      // Reset progress
      setGenerationProgress(null);
      
      // Navigate to worksheet page
      navigate(`/worksheet/${worksheetId}`);
    } catch (err: any) {
      console.error('Failed to create worksheet:', err);
      // Error message already set in catch block above, or set it here if it's a different error
      if (!aiError) {
        setAiError(err.message || t('error.failedToCreateWorksheet'));
      }
      
      // Reset progress on error
      setGenerationProgress(null);
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

  if (!subjectData || !subjectData.topicAssignments || !subjectData.topicAssignments.length) {
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
            {t('assignments.title')} - {subjectName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            {t('dashboard.noAssignments')}
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
          {t('assignments.title')} - {subjectName}
        </Typography>

        {subjectData && (
          <Box sx={{ mb: 2 }}>
            {subjectData.statistics.grade === undefined || subjectData.statistics.grade === null ? (
              <Typography variant="body2" color="text.secondary">
                {t('grade.noGrade')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                  {t(`grade.${subjectData.statistics.grade}`)}
                </Typography>
                <Typography variant="h4" component="span" sx={{ fontSize: '2.5rem', lineHeight: 1 }}>
                  {(() => {
                    const emojiMap: Record<number, string> = {
                      1: '😍',
                      2: '😊',
                      3: '🙂',
                      4: '😐',
                      5: '😟',
                      6: '😱',
                    };
                    return emojiMap[subjectData.statistics.grade] || '';
                  })()}
                </Typography>
              </Box>
            )}
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
                alert(err.message || t('error.failedToUpdateAssignment'));
              } finally {
                setSaving(false);
              }
            };

            const handleDelete = async () => {
              if (!propStudentId || isReadOnly) return;
              
              if (!window.confirm(t('common.deleteConfirm'))) {
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
                alert(err.message || t('error.failedToDeleteAssignment'));
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
                  primary={topic?.shortName || `${t('topics.title')} ${assignment.topicId}`}
                  secondary={topic?.taskDescription || t('assignments.noDescription')}
                  sx={{ flex: 1 }}
                />
                <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ minWidth: 120 }}>
                    {isReadOnly ? (
                      <Typography variant="body2" color="text.secondary">
                        {assignment.count} {t('assignments.exercises')}
                      </Typography>
                    ) : (
                      <FormControl size="small" fullWidth>
                        <InputLabel>{t('assignments.exercises')}</InputLabel>
                        <Select
                          value={assignment.count}
                          label={t('assignments.exercises')}
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

        {(onPractice || userIdForWorksheet) && (
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
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
                {generatingWorksheet ? t('assignments.generating') : (isGenerateMode ? t('assignments.generate') : t('assignments.practice'))}
              </Button>
              {generationProgress && (
                <Box sx={{ mt: 2, width: '100%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(generationProgress.current / generationProgress.total) * 100}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                    {generationProgress.current} {t('worksheet.of')} {generationProgress.total} {t('worksheet.exercises')}
                  </Typography>
                </Box>
              )}
            </Box>
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

      <Snackbar
        open={!!aiError}
        autoHideDuration={10000}
        onClose={() => setAiError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setAiError(null)} 
          severity="error" 
          sx={{ width: '100%', maxWidth: '600px' }}
        >
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            AI Exercise Generation Error
          </Typography>
          <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
            {aiError}
          </Typography>
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default Assignments;
