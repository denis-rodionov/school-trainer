import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Autocomplete,
  CircularProgress,
  Alert,
  Paper,
  Typography,
  Divider,
} from '@mui/material';
import { Science, Refresh } from '@mui/icons-material';
import { Topic, Subject } from '../../types';
import { createTopic, updateTopic, getTopics } from '../../services/topics';
import { useAuth } from '../../contexts/AuthContext';
import { generateExercise } from '../../services/ai';
import { parseMarkdown, extractCorrectAnswers } from '../../utils/markdownParser';

interface TopicFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  topic?: Topic | null;
}

const TopicForm: React.FC<TopicFormProps> = ({ open, onClose, onSave, topic }) => {
  const { currentUser } = useAuth();
  const [subject, setSubject] = useState<Subject>('');
  const [shortName, setShortName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [defaultExerciseCount, setDefaultExerciseCount] = useState<number>(3);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [testExercise, setTestExercise] = useState<string | null>(null);
  const [testExerciseMarkdown, setTestExerciseMarkdown] = useState<string | null>(null);
  const [testingExercise, setTestingExercise] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubjects = async () => {
      if (open) {
        const allTopics = await getTopics();
        const uniqueSubjects = Array.from(new Set(allTopics.map((t) => t.subject)));
        setAvailableSubjects(uniqueSubjects);
      }
    };
    loadSubjects();

    if (topic) {
      setSubject(topic.subject);
      setShortName(topic.shortName);
      setTaskDescription(topic.taskDescription);
      setPrompt(topic.prompt);
      setDefaultExerciseCount(topic.defaultExerciseCount ?? 3);
    } else {
      setSubject('');
      setShortName('');
      setTaskDescription('');
      setPrompt('');
      setDefaultExerciseCount(3);
    }
    setErrors({});
    setTestExercise(null);
    setTestExerciseMarkdown(null);
    setTestError(null);
  }, [topic, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!shortName.trim()) {
      newErrors.shortName = 'Short name is required';
    }

    if (!taskDescription.trim()) {
      newErrors.taskDescription = 'Task description is required';
    }

    if (!prompt.trim()) {
      newErrors.prompt = 'Prompt is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!prompt.trim()) {
      setTestError('Please enter a prompt first');
      return;
    }

    if (!shortName.trim()) {
      setTestError('Please enter a short name first');
      return;
    }

    try {
      setTestingExercise(true);
      setTestError(null);
      
      const result = await generateExercise({
        prompt: prompt.trim(),
        topicName: shortName.trim() || 'Test Topic',
        exerciseNumber: defaultExerciseCount || 1,
      });

      setTestExerciseMarkdown(result.markdown);
      
      // Extract the original text from markdown for display
      // Remove HTML tags and show the raw exercise
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = result.markdown;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      setTestExercise(textContent);
    } catch (err: any) {
      setTestError(err.message || 'Failed to generate test exercise');
      setTestExercise(null);
      setTestExerciseMarkdown(null);
    } finally {
      setTestingExercise(false);
    }
  };

  const handleSave = async () => {
    if (!validate() || !currentUser) {
      return;
    }

    try {
      if (topic) {
        await updateTopic(topic.id, {
          subject,
          shortName: shortName.trim(),
          taskDescription: taskDescription.trim(),
          prompt: prompt.trim(),
          defaultExerciseCount,
        });
      } else {
        await createTopic({
          subject,
          shortName: shortName.trim(),
          taskDescription: taskDescription.trim(),
          prompt: prompt.trim(),
          createdBy: currentUser.uid,
          defaultExerciseCount,
        });
      }
      onSave();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save topic');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{topic ? 'Edit Topic' : 'Create Topic'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Autocomplete
            freeSolo
            options={availableSubjects}
            value={subject}
            onInputChange={(_, newValue) => setSubject(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Subject"
                required
                error={!!errors.subject}
                helperText={errors.subject}
              />
            )}
          />

          <TextField
            label="Short Name"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            required
            error={!!errors.shortName}
            helperText={errors.shortName}
            fullWidth
          />

          <TextField
            label="Task Description"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            required
            error={!!errors.taskDescription}
            helperText={errors.taskDescription}
            multiline
            rows={3}
            fullWidth
          />

          <TextField
            label="Prompt (for AI generation)"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setTestExercise(null);
              setTestExerciseMarkdown(null);
              setTestError(null);
            }}
            required
            error={!!errors.prompt}
            helperText={errors.prompt}
            multiline
            rows={3}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Default Exercise Count</InputLabel>
            <Select
              value={defaultExerciseCount}
              label="Default Exercise Count"
              onChange={(e) => setDefaultExerciseCount(Number(e.target.value))}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                <MenuItem key={num} value={num}>
                  {num}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Button
              variant="outlined"
              startIcon={testingExercise ? <CircularProgress size={16} /> : <Science />}
              onClick={handleTest}
              disabled={testingExercise || !prompt.trim() || !shortName.trim()}
              fullWidth
            >
              {testingExercise ? 'Generating...' : testExercise ? 'Regenerate Test' : 'Test Exercise'}
            </Button>

            {testError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {testError}
              </Alert>
            )}

            {testExerciseMarkdown && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Test Exercise Preview:
                </Typography>
                <Paper sx={{ p: 2, mt: 1, backgroundColor: '#f5f5f5' }}>
                  <TestExercisePreview markdown={testExerciseMarkdown} />
                </Paper>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Component to preview test exercise
const TestExercisePreview: React.FC<{ markdown: string }> = ({ markdown }) => {
  const parsed = parseMarkdown(markdown);
  const correctAnswers = extractCorrectAnswers(markdown);
  let answerIndex = 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
      {parsed.parts.map((part, partIndex) => {
        if (part.isGap) {
          const currentAnswerIndex = answerIndex++;
          const correctAnswer = correctAnswers[currentAnswerIndex] || part.correctAnswer || '';

          return (
            <TextField
              key={`gap-${partIndex}`}
              value=""
              disabled
              size="small"
              placeholder="____"
              sx={{
                width: '120px',
                '& .MuiInputBase-input': {
                  backgroundColor: '#fff',
                  fontSize: '16px',
                },
              }}
              inputProps={{
                'data-answer': correctAnswer,
              }}
              helperText={`Answer: ${correctAnswer}`}
            />
          );
        } else {
          return (
            <Typography
              key={`text-${partIndex}`}
              component="span"
              sx={{ fontSize: '16px', whiteSpace: 'pre-wrap' }}
            >
              {part.text}
            </Typography>
          );
        }
      })}
    </Box>
  );
};

export default TopicForm;
