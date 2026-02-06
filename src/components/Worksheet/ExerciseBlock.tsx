import React from 'react';
import { Box, Typography, TextField, Paper, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { Exercise } from '../../types';
import { parseMarkdown, extractCorrectAnswers } from '../../utils/markdownParser';
import { useLanguage } from '../../contexts/LanguageContext';

/** Returns true if the answer looks like a number (so we show number keyboard on mobile). */
function isNumericAnswer(answer: string): boolean {
  const trimmed = (answer ?? '').trim();
  if (!trimmed) return false;
  return /^-?\d*\.?\d+$/.test(trimmed);
}

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
  onExerciseFocus?: () => void;
  onExerciseBlur?: () => void;
  isCompleted?: boolean; // Whether the worksheet is completed
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
  onExerciseFocus,
  onExerciseBlur,
  isCompleted = false,
}) => {
  const { t } = useLanguage();
  const markdown = exercise.markdown ?? '';
  // Extract correct answers from markdown
  const correctAnswers = extractCorrectAnswers(markdown);
  const parsed = parseMarkdown(markdown);
  let answerIndex = 0;

  // Extract wrong answer value for display - get just the answer part, not the full expression
  const wrongAnswerValue = exercise.userInput
    ? (() => {
        let clean = exercise.userInput || '';
        // First decode HTML entities (in case they're escaped)
        clean = clean
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ');
        // Then strip all HTML tags
        clean = clean
          .replace(/<p[^>]*>/gi, '')
          .replace(/<\/p>/gi, ' ')
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Extract just the answer value (last part after "=" or the last meaningful word/number)
        // For expressions like "70 * 700 = 48998", extract "48998"
        // For simple answers, just use the cleaned text
        const equalsIndex = clean.lastIndexOf('=');
        if (equalsIndex >= 0) {
          // Extract everything after the last "="
          const answerPart = clean.substring(equalsIndex + 1).trim();
          return answerPart || clean; // Fallback to full text if nothing after "="
        }
        
        // If no "=", try to extract the last number or word
        const parts = clean.trim().split(/\s+/);
        if (parts.length > 0) {
          // Return the last part (likely the answer)
          return parts[parts.length - 1];
        }
        
        return clean;
      })()
    : null;

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
            const userAnswer = answers[currentAnswerIndex] || '';
            
            // For trainer view: check if answer is correct
            const isCorrect = showCorrectAnswers && userAnswer.trim() && 
              userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

            const isNumeric = isNumericAnswer(correctAnswer);
            
            return (
              <TextField
                key={`gap-${partIndex}`}
                type={isNumeric ? 'number' : 'text'}
                value={userAnswer}
                onChange={(e) => onAnswerChange(currentAnswerIndex, e.target.value)}
                onFocus={() => {
                  // Track which exercise is focused
                  if (onExerciseFocus) {
                    onExerciseFocus();
                  }
                }}
                onBlur={() => {
                  // Save exercise when leaving it
                  if (onExerciseBlur) {
                    onExerciseBlur();
                  }
                }}
                disabled={isReadOnly}
                error={hasError || isExerciseMarkedAsError}
                size="small"
                sx={{
                  width: '120px',
                  '& .MuiInputBase-input': {
                    // For trainers: prioritize color coding (correct/incorrect) over read-only gray
                    backgroundColor: showCorrectAnswers && userAnswer.trim()
                      ? (isCorrect ? '#e8f5e9' : '#ffebee') // Green for correct, red for incorrect
                      : hasError || isExerciseMarkedAsError
                      ? '#ffebee' // Red for errors
                      : isReadOnly
                      ? '#f5f5f5' // Gray for read-only (when not trainer view)
                      : 'white', // White for editable
                    fontSize: '16px', // Match text font size
                  },
                  ...(showCorrectAnswers && isCorrect && {
                    '& .MuiOutlinedInput-root': {
                      borderColor: 'success.main',
                      '&:hover': {
                        borderColor: 'success.dark',
                      },
                    },
                  }),
                  ...(showCorrectAnswers && userAnswer.trim() && !isCorrect && {
                    '& .MuiOutlinedInput-root': {
                      borderColor: 'error.main',
                      '&:hover': {
                        borderColor: 'error.dark',
                      },
                    },
                  }),
                }}
                inputProps={{
                  'data-answer': correctAnswer,
                  inputMode: isNumeric ? 'decimal' : 'text',
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
      {/* Show attempt info for completed worksheets in trainer view when attempt > 1 */}
      {isCompleted && showCorrectAnswers && exercise.attempt && exercise.attempt > 1 && wrongAnswerValue && (
        <Typography 
          variant="caption" 
          color="error" 
          sx={{ mt: 1, display: 'block', fontWeight: 500 }}
        >
          {t('exercise.attempt')} {exercise.attempt} ({t('exercise.wrong')}: {wrongAnswerValue})
        </Typography>
      )}
    </Paper>
  );
};

export default ExerciseBlock;
