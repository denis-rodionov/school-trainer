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
} from '@mui/material';
import { Topic, Subject } from '../../types';
import { createTopic, updateTopic, getTopics } from '../../services/topics';
import { useAuth } from '../../contexts/AuthContext';

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
            onChange={(e) => setPrompt(e.target.value)}
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

export default TopicForm;
