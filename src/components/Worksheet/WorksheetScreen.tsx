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
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import {
  getWorksheet,
  getExercises,
  completeWorksheet,
  updateWorksheet,
} from '../../services/worksheets';
import { getTopic } from '../../services/topics';
import { Worksheet, Exercise } from '../../types';
import ExerciseBlock from './ExerciseBlock';
import { transformMarkdownWithAnswers } from '../../utils/markdownParser';
import {
  updateSubjectStatistics,
  getSubjectData,
} from '../../services/users';
import { isWithinLastDays } from '../../utils/dateUtils';
import { Timestamp } from 'firebase/firestore';

const WorksheetScreen: React.FC = () => {
  const { worksheetId } = useParams<{ worksheetId: string }>();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<string, any>>({});
  const [answers, setAnswers] = useState<string[]>([]);
  const [errors, setErrors] = useState<boolean[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isTrainer = userData?.role === 'trainer';
  const isCompleted = worksheet?.status === 'completed';
  const isReadOnly = isTrainer || isCompleted;

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
          setError('Worksheet not found');
          return;
        }

        // Check if trainer can view this worksheet
        if (isTrainer && worksheetData.studentId !== currentUser?.uid) {
          // Trainer viewing student's worksheet - this is allowed
        } else if (!isTrainer && worksheetData.studentId !== currentUser?.uid) {
          setError('You do not have permission to view this worksheet');
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

        // Initialize answers - calculate total number of gaps
        const totalGaps = sortedExercises.reduce((sum, ex) => sum + ex.correctAnswers.length, 0);
        if (isCompleted) {
          // For completed worksheets, we'll show userInput text
          setAnswers(new Array(totalGaps).fill(''));
        } else {
          setAnswers(new Array(totalGaps).fill(''));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load worksheet');
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
    // Clear error for this field
    if (errors[index]) {
      const newErrors = [...errors];
      newErrors[index] = false;
      setErrors(newErrors);
    }
  };

  const evaluateAnswers = (): boolean[] => {
    const newErrors: boolean[] = [];
    exercises.forEach((exercise, exerciseIndex) => {
      // For each exercise, check all gaps
      exercise.correctAnswers.forEach((correctAnswer, answerIndex) => {
        const globalIndex = exercises
          .slice(0, exerciseIndex)
          .reduce((sum, ex) => sum + ex.correctAnswers.length, 0) + answerIndex;
        const userAnswer = answers[globalIndex]?.trim().toLowerCase();
        const correct = correctAnswer.trim().toLowerCase();
        newErrors[globalIndex] = userAnswer !== correct;
      });
    });
    return newErrors;
  };

  const handleSubmit = async () => {
    if (isReadOnly) return;

    const newErrors = evaluateAnswers();
    setErrors(newErrors);
    setSubmitted(true);

    if (newErrors.some((e) => e)) {
      return; // Don't submit if there are errors
    }

    if (!worksheet || !currentUser) return;

    try {
      setSaving(true);

      // Calculate score
      const totalAnswers = answers.length;
      const correctAnswers = totalAnswers - newErrors.filter((e) => e).length;
      const score = (correctAnswers / totalAnswers) * 100;

      // Transform markdown with answers for storage
      const userInputs: string[] = [];
      let globalAnswerIndex = 0;

      exercises.forEach((exercise) => {
        const exerciseAnswers: string[] = [];
        exercise.correctAnswers.forEach(() => {
          exerciseAnswers.push(answers[globalAnswerIndex] || '');
          globalAnswerIndex++;
        });
        const userInput = transformMarkdownWithAnswers(exercise.markdown, exerciseAnswers);
        userInputs.push(userInput);
      });

      // Complete worksheet
      await completeWorksheet(worksheet.id, score, userInputs);

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
      alert(err.message || 'Failed to submit worksheet');
    } finally {
      setSaving(false);
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
    return <Alert severity="error">Worksheet not found</Alert>;
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4">Worksheet</Typography>
        {worksheet.status === 'completed' && worksheet.score !== undefined && (
          <Chip
            label={`Score: ${Math.round(worksheet.score)}%`}
            color={worksheet.score >= 80 ? 'success' : worksheet.score >= 60 ? 'warning' : 'error'}
            sx={{ ml: 2 }}
          />
        )}
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
          globalAnswerIndex += ex.correctAnswers.length;
        }

        return (
          <Paper key={topicId} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {topic.shortName}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {topic.taskDescription}
            </Typography>
            {topicExercises.map((exercise) => {
              const exerciseAnswerStart = globalAnswerIndex;
              const exerciseAnswers = answers.slice(
                exerciseAnswerStart,
                exerciseAnswerStart + exercise.correctAnswers.length
              );
              const exerciseErrors = errors.slice(
                exerciseAnswerStart,
                exerciseAnswerStart + exercise.correctAnswers.length
              );

              // Update globalAnswerIndex for next exercise
              globalAnswerIndex += exercise.correctAnswers.length;

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
                />
              );
            })}
          </Paper>
        );
      })}

      {!isReadOnly && (
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={saving || answers.some((a) => !a.trim())}
            size="large"
          >
            {saving ? 'Submitting...' : submitted ? 'Re-submit' : 'Submit'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default WorksheetScreen;
