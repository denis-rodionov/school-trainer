import React from 'react';
import { Box, Typography, TextField, Paper, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { Exercise } from '../../types';
import { parseMarkdown, extractCorrectAnswers } from '../../utils/markdownParser';
import { useLanguage } from '../../contexts/LanguageContext';

interface ExerciseBlockProps {
  exercise: Exercise;
  answers: string[];
  onAnswerChange: (index: number, value: string) => void;
  errors?: boolean[];
  isReadOnly?: boolean;
  showCorrectAnswers?: boolean;
  isReviewMode?: boolean;
  isExerciseMarkedAsError?: boolean;
  onMarkError?: () => void;
}

const ExerciseBlock: React.FC<ExerciseBlockProps> = ({
  exercise,
  answers,
  onAnswerChange,
  errors = [],
  isReadOnly = false,
  showCorrectAnswers = false,
  isReviewMode = false,
  isExerciseMarkedAsError = false,
  onMarkError,
}) => {
  const { t } = useLanguage();
  const markdown = exercise.markdown ?? '';
  // Extract correct answers from markdown
  const correctAnswers = extractCorrectAnswers(markdown);
  const parsed = parseMarkdown(markdown);
  let answerIndex = 0;

  // Fallback when markdown has no <input> tags (e.g. wrong format or dictation stored as fill-gaps): show stripped text so content is visible in trainer view
  const hasNoParts = !parsed.parts.length || parsed.parts.every((p) => !p.isGap && !(p.text || '').trim());
  const fallbackText = hasNoParts
    ? markdown
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim()
    : '';

  return (
    <Paper sx={{ p: 2, mb: 2, minHeight: 56, backgroundColor: errors.some((e) => e) || isExerciseMarkedAsError ? '#ffebee' : 'transparent' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        {hasNoParts ? (
          <Typography component="span" sx={{ fontSize: '16px', lineHeight: '40px', display: 'inline-block', flex: 1 }}>
            {fallbackText || t('exercise.noContent')}
          </Typography>
        ) : (
        parsed.parts.map((part, partIndex) => {
          if (part.isGap) {
            const currentAnswerIndex = answerIndex++;
            const hasError = errors[currentAnswerIndex];
            const correctAnswer = correctAnswers[currentAnswerIndex] || part.correctAnswer || '';

            return (
              <TextField
                key={`gap-${partIndex}`}
                value={answers[currentAnswerIndex] || ''}
                onChange={(e) => onAnswerChange(currentAnswerIndex, e.target.value)}
                disabled={isReadOnly}
                error={hasError || isExerciseMarkedAsError}
                size="small"
                sx={{
                  width: '120px',
                  '& .MuiInputBase-input': {
                    backgroundColor: isReadOnly
                      ? '#f5f5f5'
                      : hasError || isExerciseMarkedAsError
                      ? '#ffebee'
                      : 'white',
                    fontSize: '16px', // Match text font size
                  },
                }}
                inputProps={{
                  'data-answer': correctAnswer,
                }}
                helperText={
                  showCorrectAnswers && correctAnswer
                    ? `${t('exercise.correct')} ${correctAnswer}`
                    : hasError || isExerciseMarkedAsError
                    ? t('exercise.incorrect')
                    : ''
                }
              />
            );
          } else {
            return (
              <Typography
                key={`text-${partIndex}`}
                component="span"
                sx={{
                  fontSize: '16px', // Match input font size
                  lineHeight: '40px', // Match input height for vertical alignment
                  display: 'inline-block',
                }}
              >
                {part.text}
            </Typography>
          );
        }
        })
        )}
        {isReviewMode && !isExerciseMarkedAsError && (
          <IconButton
            size="small"
            onClick={() => onMarkError?.()}
            sx={{
              padding: '4px',
              minWidth: '24px',
              width: '24px',
              height: '24px',
              backgroundColor: 'error.main',
              color: 'white',
              marginLeft: '8px',
              '&:hover': {
                backgroundColor: 'error.dark',
              },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        )}
      </Box>
      {exercise.userInput && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {t('exercise.userInput')} {exercise.userInput}
        </Typography>
      )}
    </Paper>
  );
};

export default ExerciseBlock;
