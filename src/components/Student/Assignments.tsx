import React, { useEffect, useState, useCallback } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import { Delete, CallSplit } from '@mui/icons-material';
import { SubjectData, Subject, Topic, Exercise, TopicAssignment } from '../../types';
import { getTopic } from '../../services/topics';
import { updateSubjectTopicAssignments } from '../../services/users';
import { createWorksheet, getPendingWorksheetBySubject } from '../../services/worksheets';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translateSubject } from '../../i18n/translations';
import { generateExerciseForTopic, isTopicReady, readingPositionFor } from '../../services/exerciseGenerator';
import { firestoreRead } from '../../utils/firestoreResilience';
import { useOnFirestoreRecovery } from '../../hooks/useFirestoreRecovery';
import GutscheinPanel from '../Trainer/GutscheinPanel';
import { DEFAULT_GUTSCHEINS } from '../../services/users';
import {
  OPTION_GROUP_ONE,
  getAssignmentsNeedingChoice,
  resolveAssignmentsForGeneration,
} from '../../utils/optionGroups';

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
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatingWorksheet, setGeneratingWorksheet] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [optionGroupModalOpen, setOptionGroupModalOpen] = useState(false);
  const [pendingChoiceGroups, setPendingChoiceGroups] = useState<Map<number, TopicAssignment[]> | null>(null);
  const [selectedByGroup, setSelectedByGroup] = useState<Map<number, string>>(new Map());
  const subjectName = translateSubject(subject, language);

  const assignmentTopicIdsKey =
    subjectData?.topicAssignments?.map((assignment) => assignment.topicId).join('\0') ?? '';

  const loadTopics = useCallback(async () => {
    const topicIds = assignmentTopicIdsKey ? assignmentTopicIdsKey.split('\0') : [];
    if (!topicIds.length) {
      setTopics(new Map());
      setLoading(false);
      setLoadError('');
      return;
    }

    setLoading(true);
    setLoadError('');
    setTopics(new Map());

    try {
      const loadedTopics = await firestoreRead(() =>
        Promise.all(topicIds.map((topicId) => getTopic(topicId)))
      );
      const topicMap = new Map<string, Topic>();

      loadedTopics.forEach((topic, index) => {
        if (topic) {
          topicMap.set(topicIds[index], topic);
        }
      });

      setTopics(topicMap);
    } catch (err: any) {
      setLoadError(err.message || t('error.connectionLost'));
    } finally {
      setLoading(false);
    }
  }, [assignmentTopicIdsKey, t]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  useOnFirestoreRecovery(() => {
    if (!loading && subjectData?.topicAssignments?.length) {
      void loadTopics();
    }
  });

  const runGeneration = async (assignmentsToGenerate: TopicAssignment[]) => {
    if (!targetUserId) return;

    const totalExercises = assignmentsToGenerate.reduce((sum, assignment) => {
      const topic = topics.get(assignment.topicId);
      return isTopicReady(topic) ? sum + assignment.count : sum;
    }, 0);

    const exercises: Omit<Exercise, 'id'>[] = [];
    let exerciseOrder = 0;
    let currentExerciseIndex = 0;

    for (const assignment of assignmentsToGenerate) {
      const topic = topics.get(assignment.topicId);
      if (!isTopicReady(topic) || !topic) continue;

      const capturedExerciseIndex = currentExerciseIndex;
      const capturedExerciseOrder = exerciseOrder;

      try {
        const generatedExercises = await generateExerciseForTopic(
          topic,
          assignment.count,
          (current) => {
            setGenerationProgress({
              current: capturedExerciseIndex + current,
              total: totalExercises,
            });
          },
          readingPositionFor(assignment.readingPosition, topic.bookStartParagraph)
        );

        generatedExercises.forEach((exercise) => {
          exercises.push({
            ...exercise,
            order: capturedExerciseOrder + exercises.length,
          });
        });

        currentExerciseIndex += assignment.count;
        exerciseOrder = exercises.length;
      } catch (error: any) {
        console.error(`Failed to generate exercises for topic ${topic.shortName}:`, error);

        const errorMessage = error.message || t('error.unknownError');
        setAiError(`${t('error.failedToGenerate')} "${topic.shortName}": ${errorMessage}`);
        throw error;
      }
    }

    if (exercises.length === 0) {
      setAiError(t('error.noExercisesGenerated'));
      return;
    }

    const worksheetId = await createWorksheet(targetUserId, subject, exercises);
    setGenerationProgress(null);
    navigate(`/worksheet/${worksheetId}`);
  };

  const handlePractice = async () => {
    if (!targetUserId || !subjectData || !subjectData.topicAssignments || !subjectData.topicAssignments.length) {
      return;
    }

    try {
      const pendingWorksheet = await getPendingWorksheetBySubject(targetUserId, subject);

      if (pendingWorksheet) {
        navigate(`/worksheet/${pendingWorksheet.id}`);
        return;
      }

      const choiceGroups = getAssignmentsNeedingChoice(
        subjectData.topicAssignments,
        topics,
        isTopicReady
      );

      if (choiceGroups.size > 0) {
        setSelectedByGroup(new Map());
        setPendingChoiceGroups(choiceGroups);
        setOptionGroupModalOpen(true);
        return;
      }

      setGeneratingWorksheet(true);
      await runGeneration(subjectData.topicAssignments);
    } catch (err: any) {
      console.error('Failed to create worksheet:', err);
      if (!aiError) {
        setAiError(err.message || t('error.failedToCreateWorksheet'));
      }
      setGenerationProgress(null);
    } finally {
      setGeneratingWorksheet(false);
    }
  };

  const handleOptionGroupConfirm = async () => {
    if (!subjectData || !pendingChoiceGroups) return;

    const effectiveAssignments = resolveAssignmentsForGeneration(
      subjectData.topicAssignments,
      topics,
      isTopicReady,
      selectedByGroup
    );

    setOptionGroupModalOpen(false);
    setPendingChoiceGroups(null);

    try {
      setGeneratingWorksheet(true);
      await runGeneration(effectiveAssignments);
    } catch (err: any) {
      console.error('Failed to create worksheet:', err);
      if (!aiError) {
        setAiError(err.message || t('error.failedToCreateWorksheet'));
      }
      setGenerationProgress(null);
    } finally {
      setGeneratingWorksheet(false);
    }
  };

  const handleOptionGroupModalClose = () => {
    setOptionGroupModalOpen(false);
    setPendingChoiceGroups(null);
    setSelectedByGroup(new Map());
  };

  const allChoiceGroupsSelected =
    pendingChoiceGroups != null &&
    Array.from(pendingChoiceGroups.keys()).every((group) => selectedByGroup.has(group));

  if (loadError) {
    return (
      <Card elevation={3} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void loadTopics()}>
                {t('common.retry')}
              </Button>
            }
          >
            {loadError}
          </Alert>
        </CardContent>
      </Card>
    );
  }

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

            <GutscheinPanel
              subject={subject}
              gutscheins={subjectData.gutscheins ?? DEFAULT_GUTSCHEINS}
              isTrainerMode={!isReadOnly && Boolean(propStudentId)}
              studentId={propStudentId}
              onUpdate={onUpdate}
            />
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

            const handleOptionGroupToggle = async () => {
              if (!propStudentId || isReadOnly) return;

              setSaving(true);
              try {
                const updatedAssignments = subjectData.topicAssignments.map((a) => {
                  if (a.topicId !== assignment.topicId) return a;
                  if (a.optionGroup === OPTION_GROUP_ONE) {
                    const { optionGroup, ...rest } = a;
                    return rest;
                  }
                  return { ...a, optionGroup: OPTION_GROUP_ONE };
                });
                await updateSubjectTopicAssignments(propStudentId, subject, updatedAssignments);
                setSaveSuccess(true);
                if (onUpdate) {
                  onUpdate();
                }
              } catch (err: any) {
                console.error('Failed to update option group:', err);
                alert(err.message || t('error.failedToUpdateAssignment'));
              } finally {
                setSaving(false);
              }
            };

            const isInOptionGroup = assignment.optionGroup === OPTION_GROUP_ONE;

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
                  {!isReadOnly && (
                    <Tooltip title={t('assignments.optionGroupTooltip')}>
                      <IconButton
                        onClick={handleOptionGroupToggle}
                        color={isInOptionGroup ? 'primary' : 'default'}
                        size="small"
                        disabled={saving}
                        sx={{
                          flexShrink: 0,
                          ...(!isInOptionGroup && { color: 'action.disabled' }),
                        }}
                      >
                        <CallSplit />
                      </IconButton>
                    </Tooltip>
                  )}
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
      <Dialog open={optionGroupModalOpen} onClose={handleOptionGroupModalClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t('optionGroup.title')}</DialogTitle>
        <DialogContent>
          {pendingChoiceGroups &&
            Array.from(pendingChoiceGroups.entries()).map(([group, groupAssignments]) => (
              <Box key={group} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {groupAssignments.map((groupAssignment) => {
                    const groupTopic = topics.get(groupAssignment.topicId);
                    const isSelected = selectedByGroup.get(group) === groupAssignment.topicId;
                    return (
                      <Button
                        key={groupAssignment.topicId}
                        variant={isSelected ? 'contained' : 'outlined'}
                        onClick={() =>
                          setSelectedByGroup((prev) => {
                            const next = new Map(prev);
                            next.set(group, groupAssignment.topicId);
                            return next;
                          })
                        }
                      >
                        {groupTopic?.shortName || groupAssignment.topicId}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleOptionGroupModalClose}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void handleOptionGroupConfirm()}
            disabled={!allChoiceGroupsSelected || generatingWorksheet}
          >
            {t('optionGroup.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
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
