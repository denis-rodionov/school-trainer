import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, Paper, IconButton, Slider, Chip } from '@mui/material';
import { Close, PlayArrow, Pause } from '@mui/icons-material';
import { Exercise } from '../../types';
import { extractDictationAnswer } from '../../utils/dictationParser';
import { extractAudioUrl } from '../../utils/markdownParser';
import { getWordLevelDifferences } from '../../utils/dictationScoring';
import { useLanguage } from '../../contexts/LanguageContext';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface DictationExerciseBlockProps {
  exercise: Exercise;
  answer: string;
  onAnswerChange: (value: string) => void;
  isReadOnly?: boolean;
  showCorrectAnswer?: boolean;
  isReviewMode?: boolean;
  isExerciseMarkedAsError?: boolean;
  hasError?: boolean; // For student errors (from errors array)
  onMarkError?: () => void;
  onExerciseFocus?: () => void;
  onExerciseBlur?: () => void;
}

const DictationExerciseBlock: React.FC<DictationExerciseBlockProps> = ({
  exercise,
  answer,
  onAnswerChange,
  isReadOnly = false,
  showCorrectAnswer = false,
  isReviewMode = false,
  isExerciseMarkedAsError = false,
  hasError = false,
  onMarkError,
  onExerciseFocus,
  onExerciseBlur,
}) => {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const markdown = exercise.markdown ?? '';

  const audioUrl = exercise.audioUrl || extractAudioUrl(markdown);
  const correctAnswer = extractDictationAnswer(markdown);
  
  // For trainer view: check if answer is correct
  const isCorrect = showCorrectAnswer && answer.trim() && 
    answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  // Use a real <audio> in the DOM so we can seek and show progress
  useEffect(() => {
    if (!audioUrl) return;
    const el = document.createElement('audio');
    el.src = audioUrl;
    el.preload = 'metadata';

    const onTimeUpdate = () => {
      if (!isSeeking) setCurrentTime(el.currentTime);
    };
    const onLoadedMetadata = () => setDuration(el.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onDurationChange = () => setDuration(el.duration);

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('durationchange', onDurationChange);
    el.addEventListener('ended', onEnded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    audioRef.current = el;
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('durationchange', onDurationChange);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.pause();
      el.src = '';
      audioRef.current = null;
    };
  }, [audioUrl, isSeeking]);

  const handlePlayPause = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSliderChange = (_: unknown, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setCurrentTime((v / 100) * duration);
  };

  const handleSliderChangeCommitted = (_: unknown, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    const el = audioRef.current;
    if (el && Number.isFinite(duration)) {
      el.currentTime = (v / 100) * duration;
    }
    setIsSeeking(false);
  };

  const handleSliderMouseDown = () => setIsSeeking(true);
  const handleSliderMouseUp = () => setIsSeeking(false);

  return (
    <Paper
      sx={{
        p: 3,
        mb: 2,
        minHeight: 120,
        backgroundColor: (isExerciseMarkedAsError || hasError) ? '#ffebee' : 'transparent',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Audio player with seekable progress */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {audioUrl ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <IconButton
                  onClick={handlePlayPause}
                  disabled={isReadOnly}
                  color="primary"
                  size="medium"
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    flexShrink: 0,
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '&:disabled': {
                      backgroundColor: 'action.disabledBackground',
                      color: 'action.disabled',
                    },
                  }}
                >
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36 }}>
                  {formatTime(currentTime)}
                </Typography>
                <Slider
                  size="small"
                  value={progress}
                  onChange={handleSliderChange}
                  onChangeCommitted={handleSliderChangeCommitted}
                  onMouseDown={handleSliderMouseDown}
                  onMouseUp={handleSliderMouseUp}
                  onTouchStart={handleSliderMouseDown}
                  onTouchEnd={handleSliderMouseUp}
                  disabled={isReadOnly}
                  sx={{
                    flex: 1,
                    color: 'primary.main',
                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                    '& .MuiSlider-rail': { opacity: 0.5 },
                  }}
                  valueLabelDisplay="auto"
                  valueLabelFormat={() => formatTime((progress / 100) * duration)}
                />
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36 }}>
                  {formatTime(duration)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {t('exercise.dictation.listen')}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('exercise.dictation.audioNotAvailable')}
            </Typography>
          )}
        </Box>

        {/* Textarea: student input (populated from exercise.userInput when loading so trainer sees given answer) */}
        <TextField
          multiline
          rows={5}
          value={answer || ''}
          onChange={(e) => onAnswerChange(e.target.value)}
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
          error={isExerciseMarkedAsError || hasError}
          placeholder={t('exercise.dictation.placeholder')}
          fullWidth
          sx={{
            '& .MuiInputBase-input': {
              // For trainers: prioritize color coding (correct/incorrect) over read-only gray
              backgroundColor: showCorrectAnswer && answer.trim()
                ? (isCorrect ? '#e8f5e9' : '#ffebee') // Green for correct, red for incorrect
                : (isExerciseMarkedAsError || hasError)
                ? '#ffebee' // Red for errors
                : isReadOnly
                ? '#f5f5f5' // Gray for read-only (when not trainer view)
                : 'white', // White for editable
              fontSize: '16px',
            },
            ...(showCorrectAnswer && isCorrect && {
              '& .MuiOutlinedInput-root': {
                borderColor: 'success.main',
                '&:hover': {
                  borderColor: 'success.dark',
                },
              },
            }),
            ...(showCorrectAnswer && answer.trim() && !isCorrect && {
              '& .MuiOutlinedInput-root': {
                borderColor: 'error.main',
                '&:hover': {
                  borderColor: 'error.dark',
                },
              },
            }),
          }}
        />

        {/* Correct transcription - always show for trainers; show placeholder if missing */}
        {showCorrectAnswer && (
          <Box
            sx={{
              mt: 1,
              p: 2,
              backgroundColor: '#e8f5e9',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
              {t('exercise.correct')}:
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {correctAnswer || t('exercise.dictation.correctNotAvailable')}
            </Typography>
          </Box>
        )}

        {/* Error details: incorrect words as Chips only (no "should be") */}
        {(isExerciseMarkedAsError || hasError) && correctAnswer && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="error" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
              {t('exercise.incorrect')}
            </Typography>
            {(() => {
              const wordDiffs = getWordLevelDifferences(answer || '', correctAnswer);
              if (wordDiffs.length === 0) {
                return (
                  <Typography variant="body2" color="text.secondary">
                    {t('exercise.dictation.diffNoDetails')}
                  </Typography>
                );
              }
              return (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                  {wordDiffs.map((d, i) =>
                    d.actual ? (
                      <Chip
                        key={i}
                        label={d.actual}
                        size="small"
                        color="error"
                        variant="filled"
                        sx={{ fontWeight: 500 }}
                      />
                    ) : (
                      <Chip
                        key={i}
                        label={t('exercise.dictation.missingChip')}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ fontWeight: 500 }}
                      />
                    )
                  )}
                </Box>
              );
            })()}
          </Box>
        )}
        {(isExerciseMarkedAsError || hasError) && !correctAnswer && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {t('exercise.incorrect')}
          </Typography>
        )}

        {/* Review mode: Mark error button */}
        {isReviewMode && !isExerciseMarkedAsError && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
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
                '&:hover': {
                  backgroundColor: 'error.dark',
                },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        )}

      </Box>
    </Paper>
  );
};

export default DictationExerciseBlock;
