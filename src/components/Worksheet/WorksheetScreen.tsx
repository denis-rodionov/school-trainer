import React, { useEffect, useState, useRef } from 'react';
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
  deleteWorksheet,
  createWorksheet,
} from '../../services/worksheets';
import { getTopic } from '../../services/topics';
import { Worksheet, Exercise } from '../../types';
import ExerciseBlock from './ExerciseBlock';
import DictationExerciseBlock from './DictationExerciseBlock';
import { transformMarkdownWithAnswers, extractCorrectAnswers, extractAudioUrl, extractDraftAnswers, updateMarkdownWithDraftAnswers } from '../../utils/markdownParser';
import { extractDictationAnswer } from '../../utils/dictationParser';
import { fuzzyMatchText } from '../../utils/dictationScoring';
import {
  getSubjectData,
} from '../../services/users';
import { generateExerciseForTopic } from '../../services/exerciseGenerator';
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
  const [currentFocusedExerciseId, setCurrentFocusedExerciseId] = useState<string | null>(null); // Track which exercise is currently focused for auto-save
  const answersRef = useRef<string[]>([]); // Ref to store current answers for unmount save
  const isLoadingRef = useRef(false); // Prevent duplicate loads

  const isTrainer = userData?.role === 'trainer';
  const isCompleted = worksheet?.status === 'completed';
  const isPending = worksheet?.status === 'pending';
  const isReviewMode = isTrainer && isPending; // Trainer reviewing a pending worksheet
  const isReadOnly = (isTrainer && !isReviewMode) || isCompleted; // Read-only unless trainer is in review mode

  // Helper function to check if an exercise is a dictation exercise (audio or dictation markdown structure)
  const isDictationExercise = (exercise: Exercise): boolean => {
    const md = exercise.markdown ?? '';
    if (exercise.audioUrl || extractAudioUrl(md)) return true;
    // Markdown with textarea data-answer (dictation) even without audio
    return /<textarea[^>]*data-answer=["']/i.test(md);
  };

  useEffect(() => {
    if (!worksheetId) return;
    
    // Prevent duplicate loads
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

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

        // Initialize answers - calculate total number of gaps/answers needed
        // For FILL_GAPS: count gaps, for DICTATION: count as 1 answer per exercise
        const totalGaps = sortedExercises.reduce((sum, ex) => {
          if (isDictationExercise(ex)) {
            return sum + 1; // Dictation exercises have 1 answer (the full text)
          } else {
            const correctAnswers = extractCorrectAnswers(ex.markdown ?? '');
            return sum + correctAnswers.length;
          }
        }, 0);
        
        // Initialize attempts (1 for each exercise, will be incremented on wrong answers)
        setAttempts(new Array(sortedExercises.length).fill(1));
        // Initialize previous answers (empty arrays for each exercise)
        setPreviousAnswers(new Array(sortedExercises.length).fill([]).map(() => []));
        // Reset mistake count and exercises with mistakes when loading a new worksheet
        setMistakeCount(null);
        setExercisesWithMistakesIds(new Set());

        // Build initial answers (empty, then fill from draft answers in markdown, then from exercise.userInput for completed/pending so trainer sees student answer)
        const initialAnswers = new Array(totalGaps).fill('');
        let answerSlot = 0;
        for (const ex of sortedExercises) {
          if (isDictationExercise(ex)) {
            // First try to load from draft answers in markdown
            const draftAnswers = extractDraftAnswers(ex.markdown ?? '');
            if (draftAnswers.length > 0 && draftAnswers[0]) {
              initialAnswers[answerSlot] = draftAnswers[0];
            } else if (ex.userInput != null && ex.userInput !== '') {
              // Fallback to userInput for completed worksheets
              initialAnswers[answerSlot] = ex.userInput;
            }
            answerSlot += 1;
          } else {
            // Extract draft answers from markdown
            const draftAnswers = extractDraftAnswers(ex.markdown ?? '');
            const correctAnswers = extractCorrectAnswers(ex.markdown ?? '');
            console.log('Loading exercise markdown:', ex.markdown);
            console.log('Extracted draft answers:', draftAnswers);
            console.log('Correct answers count:', correctAnswers.length);
            for (let i = 0; i < correctAnswers.length; i++) {
              if (draftAnswers[i]) {
                initialAnswers[answerSlot + i] = draftAnswers[i];
              }
            }
            answerSlot += correctAnswers.length;
          }
        }
        setAnswers(initialAnswers);
        answersRef.current = initialAnswers; // Update ref
      } catch (err: any) {
        setError(err.message || t('error.failedToLoadWorksheet'));
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadWorksheet();
    
    // Reset loading flag when dependencies change
    return () => {
      isLoadingRef.current = false;
    };
  }, [worksheetId, currentUser, isTrainer, navigate, t]);

  // Save current exercise on unmount
  useEffect(() => {
    return () => {
      // Cleanup: save current exercise if we're unmounting
      // Only run on actual unmount, not on dependency changes
      if (currentFocusedExerciseId && worksheet && worksheet.status === 'pending' && !isTrainer && !isCompleted) {
        const currentExercise = exercises.find((ex) => ex.id === currentFocusedExerciseId);
        if (currentExercise) {
          // Find answer start index
          let answerStart = 0;
          for (const ex of exercises) {
            if (ex.id === currentExercise.id) {
              break;
            }
            if (isDictationExercise(ex)) {
              answerStart += 1;
            } else {
              answerStart += extractCorrectAnswers(ex.markdown ?? '').length;
            }
          }

          // Get current answers from ref (always up-to-date)
          const currentAnswers = answersRef.current;
          
          // Extract answers
          let exerciseDraftAnswers: string[] = [];
          if (isDictationExercise(currentExercise)) {
            exerciseDraftAnswers = [currentAnswers[answerStart] || ''];
          } else {
            const correctAnswers = extractCorrectAnswers(currentExercise.markdown ?? '');
            exerciseDraftAnswers = currentAnswers.slice(answerStart, answerStart + correctAnswers.length);
          }

          // Update markdown
          const updatedMarkdown = updateMarkdownWithDraftAnswers(
            currentExercise.markdown ?? '',
            exerciseDraftAnswers
          );

          // Log before saving
          console.log('saving exercise', updatedMarkdown);

          // Save asynchronously (don't await - component is unmounting)
          import('../../services/worksheets').then(({ updateExercise }) => {
            updateExercise(worksheet.id, currentExercise.id, {
              markdown: updatedMarkdown,
            }).catch((err) => {
              console.error('Failed to auto-save exercise on unmount:', err);
            });
          });
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run cleanup on unmount

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

  // Handler for exercise blur - saves the exercise that lost focus
  const handleExerciseBlur = async (exerciseId: string, answerStartIndex: number) => {
    // Only auto-save for pending worksheets and students (not trainers)
    if (isCompleted || isTrainer || !worksheet || worksheet.status !== 'pending') {
      return;
    }

    // Save the exercise that lost focus
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    if (exercise) {
      try {
        // Extract answers for this exercise
        let exerciseDraftAnswers: string[] = [];
        if (isDictationExercise(exercise)) {
          exerciseDraftAnswers = [answers[answerStartIndex] || ''];
        } else {
          const correctAnswers = extractCorrectAnswers(exercise.markdown ?? '');
          exerciseDraftAnswers = answers.slice(answerStartIndex, answerStartIndex + correctAnswers.length);
        }

        // Update markdown with draft answers
        const updatedMarkdown = updateMarkdownWithDraftAnswers(
          exercise.markdown ?? '',
          exerciseDraftAnswers
        );

        // Log before saving
        console.log('saving exercise', updatedMarkdown);
        console.log('draft answers:', exerciseDraftAnswers);
        console.log('original markdown:', exercise.markdown);

        // Save to database
        const { updateExercise } = await import('../../services/worksheets');
        await updateExercise(worksheet.id, exercise.id, {
          markdown: updatedMarkdown,
        });
      } catch (err) {
        console.error('Failed to auto-save exercise:', err);
        // Don't block user - just log error
      }
    }
  };

  // Handler for exercise focus - just track which exercise is focused
  const handleExerciseFocus = (exerciseId: string) => {
    setCurrentFocusedExerciseId(exerciseId);
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
      let exerciseHasError = false;
      const exerciseAnswers: string[] = [];

      if (isDictationExercise(exercise)) {
        // Dictation exercise: single answer with fuzzy matching
        const correctAnswer = extractDictationAnswer(exercise.markdown);
        const userAnswer = answers[globalIndex] || '';
        const isError = !fuzzyMatchText(userAnswer, correctAnswer);
        
        newErrors[globalIndex] = isError;
        exerciseAnswers.push(userAnswer);

        if (isError) {
          exerciseHasError = true;
          allCorrect = false;
        }
        globalIndex++;
      } else {
        // Fill gaps exercise: multiple answers with exact matching
        const correctAnswers = extractCorrectAnswers(exercise.markdown ?? '');
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
      }

      if (exerciseHasError) {
        exercisesWithMistakesSet.add(exercise.id);
      }
    });

    setErrors(newErrors);

    // If mistakeCount is not set yet, this is the first submit
    // Calculate and store the mistake count and which exercises had mistakes, then return (don't submit yet)
    if (mistakeCount === null) {
      const calculatedMistakeCount = exercisesWithMistakesSet.size;
      setMistakeCount(calculatedMistakeCount);
      setExercisesWithMistakesIds(new Set(exercisesWithMistakesSet)); // Store which exercises had mistakes
      
      // Update attempts and previous answers for exercises with mistakes
      let tempGlobalIndex = 0;
      exercises.forEach((exercise, exerciseIndex) => {
        if (exercisesWithMistakesSet.has(exercise.id)) {
          const exerciseAnswers: string[] = [];
          
          if (isDictationExercise(exercise)) {
            // Dictation: single answer
            exerciseAnswers.push(answers[tempGlobalIndex] || '');
            tempGlobalIndex++;
          } else {
            // Fill gaps: multiple answers
            const correctAnswers = extractCorrectAnswers(exercise.markdown ?? '');
            correctAnswers.forEach(() => {
              exerciseAnswers.push(answers[tempGlobalIndex] || '');
              tempGlobalIndex++;
            });
          }

          const newPreviousAnswers = [...previousAnswers];
          newPreviousAnswers[exerciseIndex] = exerciseAnswers;
          setPreviousAnswers(newPreviousAnswers);

          const newAttempts = [...attempts];
          newAttempts[exerciseIndex] = (newAttempts[exerciseIndex] || 1) + 1;
          setAttempts(newAttempts);
        } else {
          // Skip answers for exercises without mistakes
          if (isDictationExercise(exercise)) {
            tempGlobalIndex++;
          } else {
            const correctAnswers = extractCorrectAnswers(exercise.markdown ?? '');
            tempGlobalIndex += correctAnswers.length;
          }
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
        let userInput: string | null = null;
        
        if (attempt > 1) {
          if (isDictationExercise(exercise)) {
            // For dictation, userInput is just the text
            userInput = lastIncorrectAttempt[0] || null;
          } else {
            // For fill gaps, transform markdown with answers
            userInput = transformMarkdownWithAnswers(exercise.markdown ?? '', lastIncorrectAttempt);
          }
        }

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

      // Calculate and update grade for the subject
      if (exercises.length > 0) {
        const firstExercise = exercises[0];
        const topic = await getTopic(firstExercise.topicId);
        if (topic) {
          const subject = topic.subject;
          const { calculateAndUpdateGrade } = await import('../../services/gradeService');
          await calculateAndUpdateGrade(currentUser.uid, subject);
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

      // Calculate and update grade for the student's subject
      if (exercises.length > 0) {
        const firstExercise = exercises[0];
        const topic = await getTopic(firstExercise.topicId);
        if (topic) {
          const subject = topic.subject;
          const studentId = worksheet.studentId;
          const { calculateAndUpdateGrade } = await import('../../services/gradeService');
          await calculateAndUpdateGrade(studentId, subject);
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

        // Capture current values for the callback
        const capturedExerciseIndex = currentExerciseIndex;
        const capturedExerciseOrder = exerciseOrder;

        try {
          // Generate exercises using the orchestrator (handles both FILL_GAPS and DICTATION)
          const generatedExercises = await generateExerciseForTopic(
            topic,
            assignment.count,
            (current, total) => {
              // Update progress: capturedExerciseIndex + current exercises completed for this topic
              setRegenerationProgress({
                current: capturedExerciseIndex + current,
                total: totalExercises,
              });
            }
          );

          // Add generated exercises (already in correct format)
          generatedExercises.forEach((exercise) => {
            exercises.push({
              ...exercise,
              order: capturedExerciseOrder + exercises.length,
            });
          });
          
          // Update current exercise index after completing this topic
          currentExerciseIndex += assignment.count;
          exerciseOrder = exercises.length;
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
          if (isDictationExercise(ex)) {
            globalAnswerIndex += 1; // Dictation exercises have 1 answer
          } else {
            const exCorrectAnswers = extractCorrectAnswers(ex.markdown ?? '');
            globalAnswerIndex += exCorrectAnswers.length;
          }
        }

        return (
          <Paper key={topicId} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {topic.taskDescription}
            </Typography>
            {topicExercises.map((exercise) => {
              const isDictation = isDictationExercise(exercise);
              const exerciseAnswerStart = globalAnswerIndex;
              
              let exerciseAnswers: string[];
              let exerciseErrors: boolean[];
              
              if (isDictation) {
                // Dictation: single answer
                exerciseAnswers = [answers[exerciseAnswerStart] || ''];
                exerciseErrors = [errors[exerciseAnswerStart] || false];
                globalAnswerIndex += 1;
              } else {
                // Fill gaps: multiple answers
                const exerciseCorrectAnswers = extractCorrectAnswers(exercise.markdown ?? '');
                exerciseAnswers = answers.slice(
                  exerciseAnswerStart,
                  exerciseAnswerStart + exerciseCorrectAnswers.length
                );
                exerciseErrors = errors.slice(
                  exerciseAnswerStart,
                  exerciseAnswerStart + exerciseCorrectAnswers.length
                );
                globalAnswerIndex += exerciseCorrectAnswers.length;
              }

              // Check if this exercise is marked as having an error
              const isExerciseMarkedAsError = trainerMarkedErrors.has(exercise.id);

              // Render appropriate component based on exercise type
              if (isDictation) {
                return (
                  <DictationExerciseBlock
                    key={exercise.id}
                    exercise={{ ...exercise, markdown: exercise.markdown ?? '' }}
                    answer={exerciseAnswers[0] || ''}
                    onAnswerChange={(value) => handleAnswerChange(exerciseAnswerStart, value)}
                    isReadOnly={isReadOnly}
                    showCorrectAnswer={isTrainer}
                    isReviewMode={isReviewMode}
                    isExerciseMarkedAsError={isExerciseMarkedAsError}
                    hasError={exerciseErrors[0] || false}
                    onMarkError={() => handleMarkError(exercise.id)}
                    onExerciseFocus={() => handleExerciseFocus(exercise.id)}
                    onExerciseBlur={() => handleExerciseBlur(exercise.id, exerciseAnswerStart)}
                  />
                );
              } else {
                return (
                  <ExerciseBlock
                    key={exercise.id}
                    exercise={{ ...exercise, markdown: exercise.markdown ?? '' }}
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
                    onExerciseFocus={() => handleExerciseFocus(exercise.id)}
                    onExerciseBlur={() => handleExerciseBlur(exercise.id, exerciseAnswerStart)}
                    isCompleted={isCompleted}
                  />
                );
              }
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
            disabled={saving || answers.length === 0 || answers.every((a) => !a.trim())}
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
