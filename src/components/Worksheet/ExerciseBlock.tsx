import React from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
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
}

const ExerciseBlock: React.FC<ExerciseBlockProps> = ({
  exercise,
  answers,
  onAnswerChange,
  errors = [],
  isReadOnly = false,
  showCorrectAnswers = false,
}) => {
  const { t } = useLanguage();
  // Extract correct answers from markdown
  const correctAnswers = extractCorrectAnswers(exercise.markdown);
  const parsed = parseMarkdown(exercise.markdown);
  let answerIndex = 0;

  return (
    <Paper sx={{ p: 2, mb: 2, backgroundColor: errors.some((e) => e) ? '#ffebee' : 'transparent' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        {parsed.parts.map((part, partIndex) => {
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
                error={hasError}
                size="small"
                sx={{
                  width: '120px',
                  '& .MuiInputBase-input': {
                    backgroundColor: isReadOnly
                      ? '#f5f5f5'
                      : hasError
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
                    : hasError
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
        })}
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
