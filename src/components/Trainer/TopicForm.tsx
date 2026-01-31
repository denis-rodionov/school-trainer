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
} from '@mui/material';
import { Topic, Subject } from '../../types';
import { createTopic, updateTopic } from '../../services/topics';
import { useAuth } from '../../contexts/AuthContext';

interface TopicFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  topic?: Topic | null;
}

const TopicForm: React.FC<TopicFormProps> = ({ open, onClose, onSave, topic }) => {
  const { currentUser } = useAuth();
  const [subject, setSubject] = useState<Subject>('math');
  const [shortName, setShortName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (topic) {
      setSubject(topic.subject);
      setShortName(topic.shortName);
      setTaskDescription(topic.taskDescription);
      setPrompt(topic.prompt);
    } else {
      setSubject('math');
      setShortName('');
      setTaskDescription('');
      setPrompt('');
    }
    setErrors({});
  }, [topic, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

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
        });
      } else {
        await createTopic({
          subject,
          shortName: shortName.trim(),
          taskDescription: taskDescription.trim(),
          prompt: prompt.trim(),
          createdBy: currentUser.uid,
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
          <FormControl fullWidth required>
            <InputLabel>Subject</InputLabel>
            <Select
              value={subject}
              label="Subject"
              onChange={(e) => setSubject(e.target.value as Subject)}
            >
              <MenuItem value="math">Math</MenuItem>
              <MenuItem value="german">German</MenuItem>
            </Select>
          </FormControl>

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
