import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { Worksheet, Exercise, Topic, TopicAssignment } from '../../types';
import ExerciseBlock from './ExerciseBlock';
import DictationExerciseBlock from './DictationExerciseBlock';
import ReadingExerciseBlock from './ReadingExerciseBlock';
import { transformMarkdownWithAnswers, extractCorrectAnswers, extractAudioUrl, extractDraftAnswers, updateMarkdownWithDraftAnswers } from '../../utils/markdownParser';
import { extractDictationAnswer } from '../../utils/dictationParser';
import {
  isReadingMarkdown,
  extractReadingQuestions,
  extractReadingSelections,
  updateReadingMarkdownWithSelections,
  extractReadingRange,
} from '../../utils/readingParser';
import { fuzzyMatchText, getWordLevelDifferences } from '../../utils/dictationScoring';
import { computeWorksheetScore, computeWorksheetScoreFromMistakes } from '../../utils/worksheetScoring';
import {
  getSubjectData,
  updateSubjectReadingPosition,
} from '../../services/users';
import { generateExerciseForTopic, isTopicReady, readingPositionFor } from '../../services/exerciseGenerator';
import { printWorksheet } from '../../services/printing';
import { firestoreRead } from '../../utils/firestoreResilience';
import { useOnFirestoreRecovery } from '../../hooks/useFirestoreRecovery';
import {
  getAssignmentsNeedingChoice,
  resolveAssignmentsForGeneration,
} from '../../utils/optionGroups';

// Helper: check if an exercise is a dictation exercise (audio or dictation markdown structure)
const isDictationExercise = (exercise: Exercise): boolean => {
  const md = exercise.markdown ?? '';
  if (exercise.audioUrl || extractAudioUrl(md)) return true;
  // Markdown with textarea data-answer (dictation) even without audio
  return /<textarea[^>]*data-answer=["']/i.test(md);
};

// Helper: check if an exercise is a reading exercise
const isReadingExercise = (exercise: Exercise): boolean =>
  isReadingMarkdown(exercise.markdown ?? '');

// Number of answer slots an exercise contributes to the flat `answers` array.
const answerSlotCount = (exercise: Exercise): number => {
  if (isReadingExercise(exercise)) return extractReadingQuestions(exercise.markdown ?? '').length;
  if (isDictationExercise(exercise)) return 1;
  return extractCorrectAnswers(exercise.markdown ?? '').length;
};

// Extract the current draft answers stored in an exercise's markdown.
const getExerciseDraftAnswers = (exercise: Exercise): string[] => {
  if (isReadingExercise(exercise)) return extractReadingSelections(exercise.markdown ?? '');
  return extractDraftAnswers(exercise.markdown ?? '');
};

// Persist draft answers back into an exercise's markdown.
const updateExerciseDraftMarkdown = (exercise: Exercise, draftAnswers: string[]): string => {
  if (isReadingExercise(exercise)) {
    return updateReadingMarkdownWithSelections(exercise.markdown ?? '', draftAnswers);
  }
  return updateMarkdownWithDraftAnswers(exercise.markdown ?? '', draftAnswers);
};

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
  const [optionGroupModalOpen, setOptionGroupModalOpen] = useState(false);
  const [pendingChoiceGroups, setPendingChoiceGroups] = useState<Map<number, TopicAssignment[]> | null>(null);
  const [selectedByGroup, setSelectedByGroup] = useState<Map<number, string>>(new Map());
  const [regenerateTopicsMap, setRegenerateTopicsMap] = useState<Map<string, Topic> | null>(null);
  const [regenerateAssignments, setRegenerateAssignments] = useState<TopicAssignment[] | null>(null);
  const [shouldGoToDashboard, setShouldGoToDashboard] = useState(false);
  const [trainerMarkedErrors, setTrainerMarkedErrors] = useState<Set<string>>(new Set()); // Track which exercises trainer marked as errors (by exercise ID)
  const [mistakeCount, setMistakeCount] = useState<number | null>(null); // Total mistakes from first check (words/gaps), fixed for final score
  const [exercisesWithMistakesIds, setExercisesWithMistakesIds] = useState<Set<string>>(new Set()); // Track which exercises had mistakes on first submit (for updating attempts/userInput)
  const [currentFocusedExerciseId, setCurrentFocusedExerciseId] = useState<string | null>(null); // Track which exercise is currently focused for auto-save
  const answersRef = useRef<string[]>([]); // Ref to store current answers for unmount save
  const isLoadingRef = useRef(false); // Prevent duplicate loads

  const isTrainer = userData?.role === 'trainer';
  const isCompleted = worksheet?.status === 'completed';
  const isPending = worksheet?.status === 'pending';
  const isReviewMode = isTrainer && isPending; // Trainer reviewing a pending worksheet
  const isReadOnly = (isTrainer && !isReviewMode) || isCompleted; // Read-only unless trainer is in review mode

  const loadWorksheet = useCallback(async () => {
    if (!worksheetId) return;

    try {
      setLoading(true);
      setError('');

      const [worksheetData, exercisesData] = await firestoreRead(() =>
        Promise.all([getWorksheet(worksheetId), getExercises(worksheetId)])
      );

      if (!worksheetData) {
        setShouldGoToDashboard(true);
        navigate('/dashboard');
        return;
      }

      if (isTrainer && worksheetData.studentId !== currentUser?.uid) {
        // Trainer viewing student's worksheet - allowed
      } else if (!isTrainer && worksheetData.studentId !== currentUser?.uid) {
        setError(t('error.noPermission'));
        return;
      }

      setWorksheet(worksheetData);
      const sortedExercises = exercisesData.sort((a, b) => a.order - b.order);
      setExercises(sortedExercises);

      const topics: Record<string, any> = {};
      for (const exercise of sortedExercises) {
        if (!topics[exercise.topicId]) {
          const topic = await firestoreRead(() => getTopic(exercise.topicId));
          if (topic) {
            topics[exercise.topicId] = topic;
          }
        }
      }
      setTopicsMap(topics);

      const totalGaps = sortedExercises.reduce((sum, ex) => sum + answerSlotCount(ex), 0);

      setAttempts(new Array(sortedExercises.length).fill(1));
      setPreviousAnswers(new Array(sortedExercises.length).fill([]).map(() => []));
      setMistakeCount(null);
      setExercisesWithMistakesIds(new Set());

      const initialAnswers = new Array(totalGaps).fill('');
      let answerSlot = 0;
      for (const ex of sortedExercises) {
        const count = answerSlotCount(ex);
        const draftAnswers = getExerciseDraftAnswers(ex);
        if (isDictationExercise(ex)) {
          if (draftAnswers.length > 0 && draftAnswers[0]) {
            initialAnswers[answerSlot] = draftAnswers[0];
          } else if (ex.userInput != null && ex.userInput !== '') {
            initialAnswers[answerSlot] = ex.userInput;
          }
        } else {
          for (let i = 0; i < count; i++) {
            if (draftAnswers[i]) {
              initialAnswers[answerSlot + i] = draftAnswers[i];
            }
          }
        }
        answerSlot += count;
      }
      setAnswers(initialAnswers);
      answersRef.current = initialAnswers;
    } catch (err: any) {
      setError(err.message || t('error.connectionLost'));
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [worksheetId, currentUser, isTrainer, navigate, t]);

  useEffect(() => {
    if (!worksheetId) return;
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    void loadWorksheet();

    return () => {
      isLoadingRef.current = false;
    };
  }, [worksheetId, loadWorksheet]);

  useOnFirestoreRecovery(() => {
    if (!loading && worksheetId) {
      isLoadingRef.current = false;
      void loadWorksheet();
    }
  });

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
            answerStart += answerSlotCount(ex);
          }

          // Get current answers from ref (always up-to-date)
          const currentAnswers = answersRef.current;

          // Extract answers
          const count = answerSlotCount(currentExercise);
          const exerciseDraftAnswers = isDictationExercise(currentExercise)
            ? [currentAnswers[answerStart] || '']
            : currentAnswers.slice(answerStart, answerStart + count);

          // Update markdown
          const updatedMarkdown = updateExerciseDraftMarkdown(currentExercise, exerciseDraftAnswers);

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
        const count = answerSlotCount(exercise);
        const exerciseDraftAnswers = isDictationExercise(exercise)
          ? [answers[answerStartIndex] || '']
          : answers.slice(answerStartIndex, answerStartIndex + count);

        // Update markdown with draft answers
        const updatedMarkdown = updateExerciseDraftMarkdown(exercise, exerciseDraftAnswers);

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

  const saveAllExerciseDrafts = async () => {
    if (!worksheet) return;

    const { updateExercise } = await import('../../services/worksheets');
    let answerIndex = 0;

    for (const exercise of exercises) {
      const count = answerSlotCount(exercise);
      const exerciseDraftAnswers = isDictationExercise(exercise)
        ? [answers[answerIndex] || '']
        : answers.slice(answerIndex, answerIndex + count);
      answerIndex += count;

      const updatedMarkdown = updateExerciseDraftMarkdown(exercise, exerciseDraftAnswers);

      await updateExercise(worksheet.id, exercise.id, {
        markdown: updatedMarkdown,
      });
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
    let totalMistakes = 0;

    exercises.forEach((exercise, exerciseIndex) => {
      let exerciseHasError = false;

      if (isReadingExercise(exercise)) {
        const questions = extractReadingQuestions(exercise.markdown ?? '');
        questions.forEach((question) => {
          const userAnswer = answers[globalIndex] ?? '';
          const isError = userAnswer === '' || parseInt(userAnswer, 10) !== question.correctIndex;
          newErrors[globalIndex] = isError;

          if (isError) {
            totalMistakes += 1;
            exerciseHasError = true;
            allCorrect = false;
          }
          globalIndex++;
        });
      } else if (isDictationExercise(exercise)) {
        const correctAnswer = extractDictationAnswer(exercise.markdown);
        const userAnswer = answers[globalIndex] || '';
        const isError = !fuzzyMatchText(userAnswer, correctAnswer);

        newErrors[globalIndex] = isError;

        if (isError) {
          totalMistakes += getWordLevelDifferences(userAnswer, correctAnswer).length;
          exerciseHasError = true;
          allCorrect = false;
        }
        globalIndex++;
      } else {
        const correctAnswers = extractCorrectAnswers(exercise.markdown ?? '');
        correctAnswers.forEach((correctAnswer) => {
          const userAnswer = answers[globalIndex]?.trim().toLowerCase();
          const correct = correctAnswer.trim().toLowerCase();
          const isError = userAnswer !== correct;
          newErrors[globalIndex] = isError;

          if (isError) {
            totalMistakes += 1;
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

    const isFirstCheck = mistakeCount === null;
    const scoreMistakes = isFirstCheck ? totalMistakes : mistakeCount;

    if (isFirstCheck) {
      setMistakeCount(totalMistakes);
      setExercisesWithMistakesIds(new Set(exercisesWithMistakesSet));

      let tempGlobalIndex = 0;
      exercises.forEach((exercise, exerciseIndex) => {
        const count = answerSlotCount(exercise);
        if (exercisesWithMistakesSet.has(exercise.id)) {
          const exerciseAnswers: string[] = [];
          for (let k = 0; k < count; k++) {
            exerciseAnswers.push(answers[tempGlobalIndex] || '');
            tempGlobalIndex++;
          }

          const newPreviousAnswers = [...previousAnswers];
          newPreviousAnswers[exerciseIndex] = exerciseAnswers;
          setPreviousAnswers(newPreviousAnswers);

          const newAttempts = [...attempts];
          newAttempts[exerciseIndex] = (newAttempts[exerciseIndex] || 1) + 1;
          setAttempts(newAttempts);
        } else {
          tempGlobalIndex += count;
        }
      });

      try {
        setSaving(true);
        await saveAllExerciseDrafts();
      } catch (err: any) {
        alert(err.message || t('error.failedToSubmitWorksheet'));
        return;
      } finally {
        setSaving(false);
      }

      if (!allCorrect) {
        return;
      }
    } else if (!allCorrect) {
      return;
    }

    try {
      setSaving(true);

      const score = computeWorksheetScoreFromMistakes(scoreMistakes ?? 0);
      const exercisesMarkedOnFirstCheck = isFirstCheck
        ? exercisesWithMistakesSet
        : exercisesWithMistakesIds;

      const exerciseUpdates: Array<{ exerciseId: string; updates: Partial<Exercise> }> = [];

      exercises.forEach((exercise, exerciseIndex) => {
        const hasError = exercisesMarkedOnFirstCheck.has(exercise.id);
        const attempt = hasError ? (attempts[exerciseIndex] || 2) : 1;
        const lastIncorrectAttempt = previousAnswers[exerciseIndex] || [];
        let userInput: string | null = null;

        if (attempt > 1) {
          if (isReadingExercise(exercise)) {
            // Reading selections are already persisted in markdown; no separate userInput.
            userInput = null;
          } else if (isDictationExercise(exercise)) {
            userInput = lastIncorrectAttempt[0] || null;
          } else {
            userInput = transformMarkdownWithAnswers(exercise.markdown ?? '', lastIncorrectAttempt);
          }
        }

        const updates: Partial<Exercise> = {
          attempt,
        };

        if (userInput !== null && userInput !== undefined && userInput.trim() !== '') {
          updates.userInput = userInput;
        }

        exerciseUpdates.push({
          exerciseId: exercise.id,
          updates,
        });
      });

      const { updateExercise } = await import('../../services/worksheets');
      for (const { exerciseId, updates } of exerciseUpdates) {
        await updateExercise(worksheet.id, exerciseId, updates);
      }

      await saveAllExerciseDrafts();
      await completeWorksheet(worksheet.id, score);

      // Advance reading position per topic (only forward) for any READING exercises.
      const readingEndByTopic = new Map<string, number>();
      for (const exercise of exercises) {
        if (!isReadingExercise(exercise)) continue;
        const range = extractReadingRange(exercise.markdown ?? '');
        if (!range) continue;
        const prevMax = readingEndByTopic.get(exercise.topicId) ?? 0;
        readingEndByTopic.set(exercise.topicId, Math.max(prevMax, range.endIndex));
      }
      for (const [topicId, endIndex] of Array.from(readingEndByTopic.entries())) {
        const topic = topicsMap[topicId] || (await getTopic(topicId));
        if (topic) {
          await updateSubjectReadingPosition(worksheet.studentId, topic.subject, topicId, endIndex);
        }
      }

      if (exercises.length > 0) {
        const firstExercise = exercises[0];
        const topic = await getTopic(firstExercise.topicId);
        if (topic) {
          const subject = topic.subject;
          const { calculateAndUpdateGrade } = await import('../../services/gradeService');
          await calculateAndUpdateGrade(currentUser.uid, subject);
        }
      }

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
      const score = computeWorksheetScore(correctCount, totalExercises);

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

  const runRegeneration = async (
    assignmentsToGenerate: TopicAssignment[],
    topicsForGeneration: Map<string, Topic>
  ) => {
    if (!worksheet || !worksheetId || !currentUser) return;

    const subject = worksheet.subject;
    const studentId = worksheet.studentId;

    await deleteWorksheet(worksheetId);

    const totalExercises = assignmentsToGenerate.reduce((sum, assignment) => {
      const topic = topicsForGeneration.get(assignment.topicId);
      return isTopicReady(topic) ? sum + assignment.count : sum;
    }, 0);

    const newExercises: Omit<Exercise, 'id'>[] = [];
    let exerciseOrder = 0;
    let currentExerciseIndex = 0;

    for (const assignment of assignmentsToGenerate) {
      const topic = topicsForGeneration.get(assignment.topicId);
      if (!isTopicReady(topic) || !topic) continue;

      const capturedExerciseIndex = currentExerciseIndex;
      const capturedExerciseOrder = exerciseOrder;

      try {
        const generatedExercises = await generateExerciseForTopic(
          topic,
          assignment.count,
          (current) => {
            setRegenerationProgress({
              current: capturedExerciseIndex + current,
              total: totalExercises,
            });
          },
          readingPositionFor(assignment.readingPosition, topic.bookStartParagraph)
        );

        generatedExercises.forEach((exercise) => {
          newExercises.push({
            ...exercise,
            order: capturedExerciseOrder + newExercises.length,
          });
        });

        currentExerciseIndex += assignment.count;
        exerciseOrder = newExercises.length;
      } catch (error: any) {
        console.error(`Failed to generate exercises for topic ${topic.shortName}:`, error);
        const errorMessage = error.message || t('error.unknownError');
        setRegenerateError(`${t('error.failedToGenerate')} "${topic.shortName}": ${errorMessage}`);
        throw error;
      }
    }

    if (newExercises.length === 0) {
      setRegenerateError(t('error.noExercisesGenerated'));
      return;
    }

    const newWorksheetId = await createWorksheet(studentId, subject, newExercises);
    setRegenerationProgress(null);
    setShouldGoToDashboard(true);
    navigate(`/worksheet/${newWorksheetId}`);
  };

  const handleRegenerateConfirm = async () => {
    if (!worksheet || !worksheetId || worksheet.status !== 'pending' || !currentUser) return;

    setConfirmDialogOpen(false);

    try {
      setRegenerateError(null);

      const subject = worksheet.subject;
      const studentId = worksheet.studentId;

      const subjectData = await getSubjectData(studentId, subject);
      if (!subjectData || !subjectData.topicAssignments.length) {
        throw new Error(t('error.noAssignments'));
      }

      const topicsForGeneration = new Map<string, Topic>();
      for (const assignment of subjectData.topicAssignments) {
        const topic = await getTopic(assignment.topicId);
        if (topic) {
          topicsForGeneration.set(assignment.topicId, topic);
        }
      }

      const choiceGroups = getAssignmentsNeedingChoice(
        subjectData.topicAssignments,
        topicsForGeneration,
        isTopicReady
      );

      if (choiceGroups.size > 0) {
        setRegenerateTopicsMap(topicsForGeneration);
        setRegenerateAssignments(subjectData.topicAssignments);
        setSelectedByGroup(new Map());
        setPendingChoiceGroups(choiceGroups);
        setOptionGroupModalOpen(true);
        return;
      }

      setRegenerating(true);
      await runRegeneration(subjectData.topicAssignments, topicsForGeneration);
    } catch (err: any) {
      console.error('Failed to regenerate worksheet:', err);
      if (!regenerateError) {
        setRegenerateError(err.message || t('error.failedToRegenerateWorksheet'));
      }
      setRegenerationProgress(null);
    } finally {
      setRegenerating(false);
    }
  };

  const handleOptionGroupRegenerateConfirm = async () => {
    if (!regenerateAssignments || !regenerateTopicsMap || !pendingChoiceGroups) return;

    const topicsForGeneration = regenerateTopicsMap;
    const effectiveAssignments = resolveAssignmentsForGeneration(
      regenerateAssignments,
      topicsForGeneration,
      isTopicReady,
      selectedByGroup
    );

    setOptionGroupModalOpen(false);
    setPendingChoiceGroups(null);
    setRegenerateAssignments(null);
    setRegenerateTopicsMap(null);

    try {
      setRegenerating(true);
      setRegenerateError(null);
      await runRegeneration(effectiveAssignments, topicsForGeneration);
    } catch (err: any) {
      console.error('Failed to regenerate worksheet:', err);
      if (!regenerateError) {
        setRegenerateError(err.message || t('error.failedToRegenerateWorksheet'));
      }
      setRegenerationProgress(null);
    } finally {
      setRegenerating(false);
    }
  };

  const handleOptionGroupModalClose = () => {
    setOptionGroupModalOpen(false);
    setPendingChoiceGroups(null);
    setRegenerateAssignments(null);
    setRegenerateTopicsMap(null);
    setSelectedByGroup(new Map());
  };

  const allChoiceGroupsSelected =
    pendingChoiceGroups != null &&
    Array.from(pendingChoiceGroups.keys()).every((group) => selectedByGroup.has(group));

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
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => {
          isLoadingRef.current = false;
          void loadWorksheet();
        }}>
          {t('common.retry')}
        </Button>
      </Box>
    );
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
          globalAnswerIndex += answerSlotCount(ex);
        }

        return (
          <Paper key={topicId} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {topic.taskDescription}
            </Typography>
            {topicExercises.map((exercise) => {
              const isDictation = isDictationExercise(exercise);
              const isReading = isReadingExercise(exercise);
              const exerciseAnswerStart = globalAnswerIndex;
              const slotCount = answerSlotCount(exercise);

              let exerciseAnswers: string[];
              let exerciseErrors: boolean[];

              if (isDictation) {
                // Dictation: single answer
                exerciseAnswers = [answers[exerciseAnswerStart] || ''];
                exerciseErrors = [errors[exerciseAnswerStart] || false];
                globalAnswerIndex += 1;
              } else {
                // Fill gaps / reading: multiple answers
                exerciseAnswers = answers.slice(exerciseAnswerStart, exerciseAnswerStart + slotCount);
                exerciseErrors = errors.slice(exerciseAnswerStart, exerciseAnswerStart + slotCount);
                globalAnswerIndex += slotCount;
              }

              // Check if this exercise is marked as having an error
              const isExerciseMarkedAsError = trainerMarkedErrors.has(exercise.id);

              // Render appropriate component based on exercise type
              if (isReading) {
                return (
                  <ReadingExerciseBlock
                    key={exercise.id}
                    exercise={{ ...exercise, markdown: exercise.markdown ?? '' }}
                    answers={exerciseAnswers}
                    onAnswerChange={(questionIndex, value) =>
                      handleAnswerChange(exerciseAnswerStart + questionIndex, value)
                    }
                    errors={exerciseErrors}
                    isReadOnly={isReadOnly}
                    showCorrectAnswers={isTrainer}
                    isCompleted={isCompleted}
                    onExerciseFocus={() => handleExerciseFocus(exercise.id)}
                    onExerciseBlur={() => handleExerciseBlur(exercise.id, exerciseAnswerStart)}
                  />
                );
              } else if (isDictation) {
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
            {saving
              ? (mistakeCount === null ? t('worksheet.check') : t('worksheet.submit')) + '...'
              : mistakeCount === null
              ? t('worksheet.check')
              : t('worksheet.submit')}
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
            onClick={() => void handleRegenerateConfirm()}
            variant="contained"
            color="primary"
            disabled={regenerating}
          >
            {t('worksheet.regenerate')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={optionGroupModalOpen} onClose={handleOptionGroupModalClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t('optionGroup.title')}</DialogTitle>
        <DialogContent>
          {pendingChoiceGroups &&
            Array.from(pendingChoiceGroups.entries()).map(([group, groupAssignments]) => (
              <Box key={group} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {groupAssignments.map((groupAssignment) => {
                    const groupTopic = regenerateTopicsMap?.get(groupAssignment.topicId);
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
            onClick={() => void handleOptionGroupRegenerateConfirm()}
            disabled={!allChoiceGroupsSelected || regenerating}
          >
            {t('optionGroup.confirm')}
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
