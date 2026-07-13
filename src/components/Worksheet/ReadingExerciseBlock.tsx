import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  FormLabel,
} from '@mui/material';
import { Exercise } from '../../types';
import {
  extractReadingPrev,
  extractReadingFragment,
  extractReadingQuestions,
} from '../../utils/readingParser';
import { useLanguage } from '../../contexts/LanguageContext';

interface ReadingExerciseBlockProps {
  exercise: Exercise;
  answers: string[]; // Selected option index per question (as string), '' when unanswered
  onAnswerChange: (questionIndex: number, value: string) => void;
  errors?: boolean[];
  isReadOnly?: boolean;
  showCorrectAnswers?: boolean; // Trainer view
  isCompleted?: boolean;
  onExerciseFocus?: () => void;
  onExerciseBlur?: () => void;
}

const ReadingExerciseBlock: React.FC<ReadingExerciseBlockProps> = ({
  exercise,
  answers,
  onAnswerChange,
  errors = [],
  isReadOnly = false,
  showCorrectAnswers = false,
  isCompleted = false,
  onExerciseFocus,
  onExerciseBlur,
}) => {
  const { t } = useLanguage();
  const markdown = exercise.markdown ?? '';

  const prev = extractReadingPrev(markdown);
  const fragment = extractReadingFragment(markdown);
  const questions = extractReadingQuestions(markdown);

  // Reveal correct/incorrect once the worksheet is completed or in trainer view.
  const revealAnswers = showCorrectAnswers || isCompleted;

  return (
    <Paper sx={{ p: 3, mb: 2 }} onFocus={onExerciseFocus} onBlur={onExerciseBlur}>
      {prev && (
        <Typography
          variant="body1"
          sx={{ color: 'text.disabled', mb: 1, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}
        >
          {prev}
        </Typography>
      )}

      <Box sx={{ mb: 3 }}>
        {fragment.map((paragraph, i) => (
          <Typography key={i} variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
            {paragraph}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {questions.map((question, qIndex) => {
          const selected = answers[qIndex] ?? '';
          const hasError = errors[qIndex];

          return (
            <FormControl
              key={qIndex}
              component="fieldset"
              error={hasError}
              sx={{
                p: 2,
                borderRadius: 1,
                backgroundColor: hasError ? '#ffebee' : 'transparent',
              }}
            >
              <FormLabel component="legend" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {qIndex + 1}. {question.question}
              </FormLabel>
              <RadioGroup
                value={selected}
                onChange={(e) => onAnswerChange(qIndex, e.target.value)}
              >
                {question.options.map((option, oIndex) => {
                  const value = String(oIndex);
                  const isCorrectOption = oIndex === question.correctIndex;
                  const isSelectedOption = selected === value;

                  let optionColor: string | undefined;
                  if (revealAnswers) {
                    if (isCorrectOption) {
                      optionColor = 'success.main';
                    } else if (isSelectedOption) {
                      optionColor = 'error.main';
                    }
                  }

                  return (
                    <FormControlLabel
                      key={oIndex}
                      value={value}
                      control={<Radio />}
                      disabled={isReadOnly}
                      label={option}
                      sx={{
                        color: optionColor,
                        '& .MuiFormControlLabel-label': optionColor
                          ? { fontWeight: isCorrectOption ? 600 : 400 }
                          : undefined,
                      }}
                    />
                  );
                })}
              </RadioGroup>
              {revealAnswers && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('exercise.correct')}: {question.options[question.correctIndex]}
                </Typography>
              )}
            </FormControl>
          );
        })}
      </Box>
    </Paper>
  );
};

export default ReadingExerciseBlock;
