import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import { ArrowBack, Refresh, Warning, Print } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getWorksheet,
  getExercises,
  completeWorksheet,
  updateWorksheet,
  deleteWorksheet,
  createWorksheet,
} from '../../services/worksheets';
import { getTopic } from '../../services/topics';
import { Worksheet, Exercise } from '../../types';
import ExerciseBlock from './ExerciseBlock';
import { transformMarkdownWithAnswers, extractCorrectAnswers } from '../../utils/markdownParser';
import {
  updateSubjectStatistics,
  getSubjectData,
} from '../../services/users';
import { generateExercises } from '../../services/ai';
import { isWithinLastDays } from '../../utils/dateUtils';
import { Timestamp } from 'firebase/firestore';
import { printWorksheet } from '../../services/printing';

const WorksheetScreen: React.FC = () => {
  const { worksheetId } = useParams<{ worksheetId: string }>();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<string, any>>({});
  const [answers, setAnswers] = useState<string[]>([]);
  const [errors, setErrors] = useState<boolean[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState<number[]>([]); // Track attempts per exercise
  const [previousAnswers, setPreviousAnswers] = useState<string[][]>([]); // Track previous incorrect attempts per exercise
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [regenerationProgress, setRegenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [shouldGoToDashboard, setShouldGoToDashboard] = useState(false);
  const [trainerMarkedErrors, setTrainerMarkedErrors] = useState<Set<string>>(new Set()); // Track which exercises trainer marked as errors (by exercise ID)
  const [mistakeCount, setMistakeCount] = useState<number | null>(null); // Track number of exercises with mistakes from first submit
  const [exercisesWithMistakesIds, setExercisesWithMistakesIds] = useState<Set<string>>(new Set()); // Track which exercises had mistakes on first submit (for updating attempts/userInput)

  const isTrainer = userData?.role === 'trainer';
  const isCompleted = worksheet?.status === 'completed';
  const isPending = worksheet?.status === 'pending';
  const isReviewMode = isTrainer && isPending; // Trainer reviewing a pending worksheet
  const isReadOnly = (isTrainer && !isReviewMode) || isCompleted; // Read-only unless trainer is in review mode

  useEffect(() => {
    if (!worksheetId) return;

    const loadWorksheet = async () => {
      try {
        setLoading(true);
        const [worksheetData, exercisesData] = await Promise.all([
          getWorksheet(worksheetId),
          getExercises(worksheetId),
        ]);

        if (!worksheetData) {
          // Worksheet not found (might have been deleted/regenerated)
          // Redirect to dashboard instead of showing error
          setShouldGoToDashboard(true);
          navigate('/dashboard');
          return;
        }

        // Check if trainer can view this worksheet
        if (isTrainer && worksheetData.studentId !== currentUser?.uid) {
          // Trainer viewing student's worksheet - this is allowed
        } else if (!isTrainer && worksheetData.studentId !== currentUser?.uid) {
          setError(t('error.noPermission'));
          return;
        }

        setWorksheet(worksheetData);
        const sortedExercises = exercisesData.sort((a, b) => a.order - b.order);
        setExercises(sortedExercises);

        // Load topics
        const topics: Record<string, any> = {};
        for (const exercise of sortedExercises) {
          if (!topics[exercise.topicId]) {
            const topic = await getTopic(exercise.topicId);
            if (topic) {
              topics[exercise.topicId] = topic;
            }
          }
        }
        setTopicsMap(topics);

        // Initialize answers - calculate total number of gaps from markdown
        const totalGaps = sortedExercises.reduce((sum, ex) => {
          const correctAnswers = extractCorrectAnswers(ex.markdown);
          return sum + correctAnswers.length;
        }, 0);
        
        // Initialize attempts (1 for each exercise, will be incremented on wrong answers)
        setAttempts(new Array(sortedExercises.length).fill(1));
        // Initialize previous answers (empty arrays for each exercise)
        setPreviousAnswers(new Array(sortedExercises.length).fill([]).map(() => []));
        // Reset mistake count and exercises with mistakes when loading a new worksheet
        setMistakeCount(null);
        setExercisesWithMistakesIds(new Set());
        
        if (isCompleted) {
          // For completed worksheets, we'll show userInput text
          setAnswers(new Array(totalGaps).fill(''));
        } else {
          setAnswers(new Array(totalGaps).fill(''));
        }
      } catch (err: any) {
        setError(err.message || t('error.failedToLoadWorksheet'));
      } finally {
        setLoading(false);
      }
    };

    loadWorksheet();
  }, [worksheetId, currentUser, isTrainer]);

  const handleAnswerChange = (index: number, value: string) => {
    if (isReadOnly) return;
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
    // Clear error for this field if it was previously marked as error
    if (errors[index]) {
      const newErrors = [...errors];
      newErrors[index] = false;
      setErrors(newErrors);
    }
  };

  const handleSubmit = async () => {
    if (isReadOnly) return;

    if (!worksheet || !currentUser) return;

    // Calculate errors and check correctness
    const newErrors: boolean[] = [];
    const exercisesWithMistakesSet = new Set<string>();
    let globalIndex = 0;
    let allCorrect = true;

    exercises.forEach((exercise, exerciseIndex) => {
      const correctAnswers = extractCorrectAnswers(exercise.markdown);
      let exerciseHasError = false;
      const exerciseAnswers: string[] = [];

      correctAnswers.forEach((correctAnswer) => {
        const userAnswer = answers[globalIndex]?.trim().toLowerCase();
        const correct = correctAnswer.trim().toLowerCase();
        const isError = userAnswer !== correct;
        newErrors[globalIndex] = isError;
        exerciseAnswers.push(answers[globalIndex] || '');

        if (isError) {
          exerciseHasError = true;
          allCorrect = false;
        }
        globalIndex++;
      });

      if (exerciseHasError) {
        exercisesWithMistakesSet.add(exercise.id);
      }
    });

    setErrors(newErrors);
    setSubmitted(true);

    // If mistakeCount is not set yet, this is the first submit
    // Calculate and store the mistake count and which exercises had mistakes, then return (don't submit yet)
    if (mistakeCount === null) {
      const calculatedMistakeCount = exercisesWithMistakesSet.size;
      setMistakeCount(calculatedMistakeCount);
      setExercisesWithMistakesIds(new Set(exercisesWithMistakesSet)); // Store which exercises had mistakes
      
      // Update attempts and previous answers for exercises with mistakes
      exercises.forEach((exercise, exerciseIndex) => {
        if (exercisesWithMistakesSet.has(exercise.id)) {
          const correctAnswers = extractCorrectAnswers(exercise.markdown);
          const exerciseAnswers: string[] = [];
          
          // Find the start index for this exercise's answers
          let globalStartIndex = 0;
          for (let i = 0; i < exerciseIndex; i++) {
            const exCorrectAnswers = extractCorrectAnswers(exercises[i].markdown);
            globalStartIndex += exCorrectAnswers.length;
          }
          
          correctAnswers.forEach((_, answerIndex) => {
            exerciseAnswers.push(answers[globalStartIndex + answerIndex] || '');
          });

          const newPreviousAnswers = [...previousAnswers];
          newPreviousAnswers[exerciseIndex] = exerciseAnswers;
          setPreviousAnswers(newPreviousAnswers);

          const newAttempts = [...attempts];
          newAttempts[exerciseIndex] = (newAttempts[exerciseIndex] || 1) + 1;
          setAttempts(newAttempts);
        }
      });

      // Don't submit if there are errors - user can correct and resubmit
      return;
    }

    // If mistakeCount is set and all answers are correct, proceed with submission
    if (!allCorrect) {
      return; // Still have errors, wait for user to fix them
    }

    try {
      setSaving(true);

      // Calculate score using the same method as trainer: (totalExercises - errors) / totalExercises * 100
      // Use the mistakeCount from the first submit (doesn't change after that)
      const totalExercises = exercises.length;
      const errorCount = mistakeCount;
      const correctCount = totalExercises - errorCount;
      const score = totalExercises > 0 ? (correctCount / totalExercises) * 100 : 100;

      // Update exercises with attempt and userInput
      // Use the exercisesWithMistakesIds from the first submit (doesn't change)
      const exerciseUpdates: Array<{ exerciseId: string; updates: Partial<Exercise> }> = [];

      exercises.forEach((exercise, exerciseIndex) => {
        // Check if this exercise had mistakes on first submit
        const hasError = exercisesWithMistakesIds.has(exercise.id);
        
        // Determine attempt: 1 if no errors ever, 2+ if there were errors
        const attempt = hasError ? (attempts[exerciseIndex] || 2) : 1;
        
        // userInput: null if attempt === 1 (got it right first try)
        // userInput: last incorrect attempt if attempt > 1 (stored in previousAnswers)
        const lastIncorrectAttempt = previousAnswers[exerciseIndex] || [];
        const userInput = attempt === 1 
          ? null 
          : transformMarkdownWithAnswers(exercise.markdown, lastIncorrectAttempt);

        // Build updates object, only including userInput if it's not null
        const updates: Partial<Exercise> = {
          attempt,
        };
        
        // Only include userInput if it has a value (not null or empty)
        if (userInput !== null && userInput !== undefined && userInput.trim() !== '') {
          updates.userInput = userInput;
        }

        exerciseUpdates.push({
          exerciseId: exercise.id,
          updates,
        });
      });

      // Update exercises in database
      const { updateExercise } = await import('../../services/worksheets');
      for (const { exerciseId, updates } of exerciseUpdates) {
        await updateExercise(worksheet.id, exerciseId, updates);
      }

      // Complete worksheet (userInputs no longer needed, exercises already updated)
      await completeWorksheet(worksheet.id, score);

      // Update statistics - recalculate worksheets in last 7 days
      if (exercises.length > 0) {
        const firstExercise = exercises[0];
        const topic = await getTopic(firstExercise.topicId);
        if (topic) {
          const subject = topic.subject;
          const subjectData = await getSubjectData(currentUser.uid, subject);
          if (subjectData) {
            // Get all completed worksheets in last 7 days
            const { getCompletedWorksheets } = await import('../../services/worksheets');
            const allCompleted = await getCompletedWorksheets(currentUser.uid, 100);
            const last7Days = allCompleted.filter((w) =>
              w.completedAt ? isWithinLastDays(w.completedAt, 7) : false
            );

            const newStatistics = {
              worksheetsLast7Days: last7Days.length,
              lastWorksheetDate: Timestamp.now(),
            };

            await updateSubjectStatistics(currentUser.uid, subject, newStatistics);
          }
        }
      }

      // Reload worksheet to show completed state
      const updatedWorksheet = await getWorksheet(worksheet.id);
      setWorksheet(updatedWorksheet);
      setSubmitted(false);
    } catch (err: any) {
      alert(err.message || t('error.failedToSubmitWorksheet'));
      setSubmitted(false); // Reset submitted state on error so button can be clicked again
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateClick = () => {
    setConfirmDialogOpen(true);
  };

  const handlePrint = () => {
    if (!worksheet || !exercises.length) return;
    
    printWorksheet({
      worksheet,
      exercises,
      topicsMap,
      translations: {
        title: t('worksheet.title'),
        score: t('worksheet.score'),
        pending: t('dashboard.pending'),
      },
    });
  };

  // Handler for trainer marking an error in review mode (by exercise ID)
  const handleMarkError = (exerciseId: string) => {
    if (!isReviewMode) return;
    const newErrors = new Set(trainerMarkedErrors);
    if (newErrors.has(exerciseId)) {
      newErrors.delete(exerciseId);
    } else {
      newErrors.add(exerciseId);
    }
    setTrainerMarkedErrors(newErrors);
  };

  // Handler for trainer completing the worksheet review
  const handleTrainerComplete = async () => {
    if (!worksheet || !isReviewMode || !currentUser) return;

    try {
      setSaving(true);

      // Calculate total number of exercises
      const totalExercises = exercises.length;

      // Calculate score: (totalExercises - errors) / totalExercises * 100
      const errorCount = trainerMarkedErrors.size;
      const correctCount = totalExercises - errorCount;
      const score = totalExercises > 0 ? (correctCount / totalExercises) * 100 : 100;

      // Update exercises with attempt and userInput based on trainer's review
      const exerciseUpdates: Array<{ exerciseId: string; updates: Partial<Exercise> }> = [];

      exercises.forEach((exercise) => {
        // Check if this exercise was marked as having an error
        const hasError = trainerMarkedErrors.has(exercise.id);

        // Determine attempt: 1 if no errors, 2+ if there are errors
        const attempt = hasError ? 2 : 1;

        // Build updates object
        const updates: Partial<Exercise> = {
          attempt,
        };

        // Only include userInput if there were errors (attempt > 1)
        // For now, we'll leave userInput empty since trainer is reviewing a printed worksheet
        // The student's written answers aren't captured in the system
        // We don't set userInput here - it will be omitted from the update

        exerciseUpdates.push({
          exerciseId: exercise.id,
          updates,
        });
      });

      // Update exercises in database
      const { updateExercise } = await import('../../services/worksheets');
      for (const { exerciseId, updates } of exerciseUpdates) {
        // Only include userInput if it's not null
        const finalUpdates: Partial<Exercise> = { attempt: updates.attempt };
        if (updates.userInput !== null && updates.userInput !== undefined) {
          finalUpdates.userInput = updates.userInput;
        }
        await updateExercise(worksheet.id, exerciseId, finalUpdates);
      }

      // Complete worksheet with calculated score
      await completeWorksheet(worksheet.id, score);

      // Update statistics for the student
      if (exercises.length > 0) {
        const firstExercise = exercises[0];
        const topic = await getTopic(firstExercise.topicId);
        if (topic) {
          const subject = topic.subject;
          const studentId = worksheet.studentId;
          const subjectData = await getSubjectData(studentId, subject);
          if (subjectData) {
            // Get all completed worksheets in last 7 days
            const { getCompletedWorksheets } = await import('../../services/worksheets');
            const allCompleted = await getCompletedWorksheets(studentId, 100);
            const last7Days = allCompleted.filter((w) =>
              w.completedAt ? isWithinLastDays(w.completedAt, 7) : false
            );

            const newStatistics = {
              worksheetsLast7Days: last7Days.length,
              lastWorksheetDate: Timestamp.now(),
            };

            await updateSubjectStatistics(studentId, subject, newStatistics);
          }
        }
      }

      // Reload worksheet to show completed state
      const updatedWorksheet = await getWorksheet(worksheet.id);
      setWorksheet(updatedWorksheet);
    } catch (err: any) {
      alert(err.message || t('error.failedToSubmitWorksheet'));
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!worksheet || !worksheetId || worksheet.status !== 'pending' || !currentUser) return;
    
    setConfirmDialogOpen(false);

    try {
      setRegenerating(true);
      setRegenerateError(null);
      
      // Store subject and studentId before deletion
      const subject = worksheet.subject;
      const studentId = worksheet.studentId; // Use the worksheet's studentId (works for both student and trainer)
      
      // Delete the current worksheet
      await deleteWorksheet(worksheetId);
      
      // Get topic assignments for this subject (use studentId, not currentUser.uid)
      const subjectData = await getSubjectData(studentId, subject);
      if (!subjectData || !subjectData.topicAssignments.length) {
        throw new Error(t('error.noAssignments'));
      }

      // Load topics
      const topicsMap = new Map<string, any>();
      for (const assignment of subjectData.topicAssignments) {
        const topic = await getTopic(assignment.topicId);
        if (topic) {
          topicsMap.set(assignment.topicId, topic);
        }
      }

      // Calculate total number of exercises to generate
      const totalExercises = subjectData.topicAssignments.reduce((sum, assignment) => {
        const topic = topicsMap.get(assignment.topicId);
        return topic && topic.prompt ? sum + assignment.count : sum;
      }, 0);

      // Generate new exercises from topic assignments using AI
      const exercises: Omit<Exercise, 'id'>[] = [];
      let exerciseOrder = 0;
      let currentExerciseIndex = 0;

      for (const assignment of subjectData.topicAssignments) {
        const topic = topicsMap.get(assignment.topicId);
        if (!topic || !topic.prompt) continue;

        try {
          // Generate exercises using AI with progress callback
          const generatedExercises = await generateExercises(
            topic.prompt,
            topic.shortName,
            assignment.count,
            (current, total) => {
              // Update progress: currentExerciseIndex + current exercises completed for this topic
              setRegenerationProgress({
                current: currentExerciseIndex + current,
                total: totalExercises,
              });
            }
          );

          // Convert generated exercises to our format
          generatedExercises.forEach((generated) => {
            exercises.push({
              topicId: topic.id,
              topicShortName: topic.shortName,
              markdown: generated.markdown,
              order: exerciseOrder++,
            });
          });
          
          // Update current exercise index after completing this topic
          currentExerciseIndex += assignment.count;
        } catch (error: any) {
          console.error(`Failed to generate exercises for topic ${topic.shortName}:`, error);
          const errorMessage = error.message || t('error.unknownError');
          setRegenerateError(`${t('error.failedToGenerate')} "${topic.shortName}": ${errorMessage}`);
          throw error; // Stop worksheet creation
        }
      }

      if (exercises.length === 0) {
        setRegenerateError(t('error.noExercisesGenerated'));
        return;
      }

      // Create new worksheet (use studentId, not currentUser.uid, so it works for trainers too)
      const newWorksheetId = await createWorksheet(studentId, subject, exercises);
      
      // Reset progress
      setRegenerationProgress(null);
      
      // Mark that we should go to dashboard on back (since old worksheet was deleted)
      setShouldGoToDashboard(true);
      
      // Navigate to the new worksheet
      navigate(`/worksheet/${newWorksheetId}`);
    } catch (err: any) {
      console.error('Failed to regenerate worksheet:', err);
      // Show error but stay on the page
      if (!regenerateError) {
        setRegenerateError(err.message || t('error.failedToRegenerateWorksheet'));
      }
      
      // Reset progress on error
      setRegenerationProgress(null);
    } finally {
      setRegenerating(false);
    }
  };

  // Group exercises by topic
  const exercisesByTopic = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.topicId]) {
      acc[exercise.topicId] = [];
    }
    acc[exercise.topicId].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

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

  if (!worksheet) {
    return <Alert severity="error">{t('error.worksheetNotFound')}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => {
            if (shouldGoToDashboard) {
              navigate('/dashboard');
            } else {
              // Try to go back, fallback to dashboard if no history
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/dashboard');
              }
            }
          }}
          sx={{ mr: 2 }}
        >
          {t('common.back')}
        </Button>
        <Typography variant="h4">{t('worksheet.title')}</Typography>
        {worksheet.status === 'completed' && worksheet.score !== undefined && (
          <Chip
            label={`${t('worksheet.score')}: ${Math.round(worksheet.score)}%`}
            color={worksheet.score >= 80 ? 'success' : worksheet.score >= 60 ? 'warning' : 'error'}
            sx={{ ml: 2 }}
          />
        )}
        <Box sx={{ ml: 'auto', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Print />}
            onClick={handlePrint}
          >
            {t('worksheet.print')}
          </Button>
          {worksheet.status === 'pending' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, minWidth: '200px' }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={regenerating ? <CircularProgress size={16} /> : <Refresh />}
                onClick={handleRegenerateClick}
                disabled={regenerating}
              >
                {regenerating ? t('worksheet.regenerating') : t('worksheet.regenerate')}
              </Button>
              {regenerationProgress && (
                <Box sx={{ width: '100%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(regenerationProgress.current / regenerationProgress.total) * 100}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                    {regenerationProgress.current} of {regenerationProgress.total} exercises
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {Object.entries(exercisesByTopic).map(([topicId, topicExercises]) => {
        const topic = topicsMap[topicId];
        if (!topic) return null;

        // Calculate starting index for answers in this topic
        let globalAnswerIndex = 0;
        for (const ex of exercises) {
          if (ex.topicId === topicId) {
            break;
          }
          const exCorrectAnswers = extractCorrectAnswers(ex.markdown);
          globalAnswerIndex += exCorrectAnswers.length;
        }

        return (
          <Paper key={topicId} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {topic.taskDescription}
            </Typography>
            {topicExercises.map((exercise) => {
              const exerciseCorrectAnswers = extractCorrectAnswers(exercise.markdown);
              const exerciseAnswerStart = globalAnswerIndex;
              const exerciseAnswers = answers.slice(
                exerciseAnswerStart,
                exerciseAnswerStart + exerciseCorrectAnswers.length
              );
              const exerciseErrors = errors.slice(
                exerciseAnswerStart,
                exerciseAnswerStart + exerciseCorrectAnswers.length
              );

              // Update globalAnswerIndex for next exercise
              globalAnswerIndex += exerciseCorrectAnswers.length;

              // Check if this exercise is marked as having an error
              const isExerciseMarkedAsError = trainerMarkedErrors.has(exercise.id);

              return (
                <ExerciseBlock
                  key={exercise.id}
                  exercise={exercise}
                  answers={exerciseAnswers}
                  onAnswerChange={(localIndex, value) =>
                    handleAnswerChange(exerciseAnswerStart + localIndex, value)
                  }
                  errors={exerciseErrors}
                  isReadOnly={isReadOnly}
                  showCorrectAnswers={isTrainer}
                  isReviewMode={isReviewMode}
                  isExerciseMarkedAsError={isExerciseMarkedAsError}
                  onMarkError={() => handleMarkError(exercise.id)}
                />
              );
            })}
          </Paper>
        );
      })}

      {isReviewMode && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="success"
            onClick={handleTrainerComplete}
            disabled={saving}
            size="large"
          >
            {saving ? t('worksheet.completing') + '...' : t('worksheet.complete')}
          </Button>
        </Box>
      )}

      {!isReadOnly && !isReviewMode && (
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={saving || answers.length === 0 || answers.some((a) => !a.trim())}
            size="large"
          >
            {saving ? t('worksheet.submit') + '...' : t('worksheet.submit')}
          </Button>
        </Box>
      )}

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          {t('worksheet.regenerate')}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t('worksheet.regenerateConfirm')} {t('worksheet.regenerateWarning')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleRegenerate}
            variant="contained"
            color="primary"
            disabled={regenerating}
          >
            {t('worksheet.regenerate')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!regenerateError}
        autoHideDuration={10000}
        onClose={() => setRegenerateError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setRegenerateError(null)} 
          severity="error" 
          sx={{ width: '100%', maxWidth: '600px' }}
        >
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Failed to Regenerate Worksheet
          </Typography>
          <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
            {regenerateError}
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorksheetScreen;
