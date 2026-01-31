import React from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
import { Exercise } from '../../types';
import { parseMarkdown } from '../../utils/markdownParser';

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
  const parsed = parseMarkdown(exercise.markdown, exercise.correctAnswers);
  let answerIndex = 0;

  return (
    <Paper sx={{ p: 2, mb: 2, backgroundColor: errors.some((e) => e) ? '#ffebee' : 'transparent' }}>
      <Box>
        {parsed.parts.map((part, partIndex) => {
          if (part.isGap) {
            const currentAnswerIndex = answerIndex++;
            const hasError = errors[currentAnswerIndex];
            const correctAnswer = exercise.correctAnswers[currentAnswerIndex];

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
                  mx: 0.5,
                  '& .MuiInputBase-input': {
                    backgroundColor: isReadOnly
                      ? '#f5f5f5'
                      : hasError
                      ? '#ffebee'
                      : 'white',
                  },
                }}
                inputProps={{
                  'data-answer': correctAnswer,
                }}
                helperText={
                  showCorrectAnswers && correctAnswer
                    ? `Correct: ${correctAnswer}`
                    : hasError
                    ? 'Incorrect'
                    : ''
                }
              />
            );
          } else {
            return <span key={`text-${partIndex}`}>{part.text}</span>;
          }
        })}
      </Box>
      {exercise.userInput && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          User input: {exercise.userInput}
        </Typography>
      )}
    </Paper>
  );
};

export default ExerciseBlock;
