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
  Grid,
} from '@mui/material';
import { Science, Refresh, Translate } from '@mui/icons-material';
import { Topic, Subject } from '../../types';
import { createTopic, updateTopic, getTopics } from '../../services/topics';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translateSubject, getSubjectConstant } from '../../i18n/translations';
import { AVAILABLE_SUBJECTS } from '../../constants/subjects';
import { generateExercise } from '../../services/ai';
import { parseMarkdown, extractCorrectAnswers } from '../../utils/markdownParser';
import { translateToGerman } from '../../services/translation';

interface TopicFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  topic?: Topic | null;
}

const TopicForm: React.FC<TopicFormProps> = ({ open, onClose, onSave, topic }) => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [subject, setSubject] = useState<Subject>('');
  const [subjectInputValue, setSubjectInputValue] = useState<string>('');
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
  
  // Translation state
  const [originalValues, setOriginalValues] = useState<{
    shortName: string;
    taskDescription: string;
    prompt: string;
  }>({ shortName: '', taskDescription: '', prompt: '' });
  const [translating, setTranslating] = useState<{
    shortName: boolean;
    taskDescription: boolean;
    prompt: boolean;
  }>({ shortName: false, taskDescription: false, prompt: false });
  const [translatedField, setTranslatedField] = useState<'shortName' | 'taskDescription' | 'prompt' | null>(null);

  useEffect(() => {
    const loadSubjects = async () => {
      if (open) {
        // Use predefined list of available subjects, but also include any subjects from existing topics
        // (in case new subjects are added to translations but not yet to AVAILABLE_SUBJECTS)
        const allTopics = await getTopics();
        const topicsSubjects = Array.from(new Set(allTopics.map((t) => t.subject)));
        // Combine predefined subjects with subjects from existing topics
        const allSubjects = Array.from(new Set([...AVAILABLE_SUBJECTS, ...topicsSubjects]));
        setAvailableSubjects(allSubjects);
      }
    };
    loadSubjects();

    if (topic) {
      setSubject(topic.subject);
      setSubjectInputValue(translateSubject(topic.subject, language));
      setShortName(topic.shortName);
      setTaskDescription(topic.taskDescription);
      setPrompt(topic.prompt);
      setDefaultExerciseCount(topic.defaultExerciseCount ?? 3);
    } else {
      setSubject('');
      setSubjectInputValue('');
      setShortName('');
      setTaskDescription('');
      setPrompt('');
      setDefaultExerciseCount(3);
    }
    setErrors({});
    setTestExercise(null);
    setTestExerciseMarkdown(null);
    setTestError(null);
    setTranslatedField(null);
    setOriginalValues({ shortName: '', taskDescription: '', prompt: '' });
  }, [topic, open, language]);
  
  // Update input value when language changes but subject stays the same
  useEffect(() => {
    if (subject) {
      setSubjectInputValue(translateSubject(subject, language));
    }
  }, [language]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!subject.trim()) {
      newErrors.subject = t('validation.subjectRequired');
    }

    if (!shortName.trim()) {
      newErrors.shortName = t('validation.shortNameRequired');
    }

    if (!taskDescription.trim()) {
      newErrors.taskDescription = t('validation.taskDescriptionRequired');
    }

    if (!prompt.trim()) {
      newErrors.prompt = t('validation.promptRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTranslate = async (field: 'shortName' | 'taskDescription' | 'prompt') => {
    const currentValue = field === 'shortName' ? shortName : field === 'taskDescription' ? taskDescription : prompt;
    
    if (!currentValue.trim()) {
      return;
    }

    try {
      // Store original value if not already stored
      if (!translatedField) {
        setOriginalValues({
          shortName,
          taskDescription,
          prompt,
        });
      }

      setTranslating(prev => ({ ...prev, [field]: true }));
      
      const translated = await translateToGerman(currentValue);
      
      if (field === 'shortName') {
        setShortName(translated);
      } else if (field === 'taskDescription') {
        setTaskDescription(translated);
      } else {
        setPrompt(translated);
      }
      
      setTranslatedField(field);
    } catch (err: any) {
      alert(err.message || t('error.failedToTranslate'));
    } finally {
      setTranslating(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleRevert = () => {
    setShortName(originalValues.shortName);
    setTaskDescription(originalValues.taskDescription);
    setPrompt(originalValues.prompt);
    setTranslatedField(null);
    setOriginalValues({ shortName: '', taskDescription: '', prompt: '' });
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
        topicName: shortName.trim() || t('topics.testExercise'),
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
      setTestError(err.message || t('error.failedToGenerateTest'));
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
      <DialogTitle>{topic ? t('topics.edit') : t('topics.create')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={10}>
              <Autocomplete
                freeSolo
                options={availableSubjects}
                value={subject}
                inputValue={subjectInputValue}
                onInputChange={(_, newValue) => {
                  // Update the display value
                  setSubjectInputValue(newValue);
                  // Convert typed input back to constant and update stored value
                  if (newValue) {
                    const constantValue = getSubjectConstant(newValue);
                    setSubject(constantValue);
                  } else {
                    setSubject('');
                  }
                }}
                onChange={(_, newValue) => {
                  // When an option is selected, newValue is the constant from availableSubjects
                  if (newValue) {
                    setSubject(newValue);
                    setSubjectInputValue(translateSubject(newValue, language));
                  } else {
                    setSubject('');
                    setSubjectInputValue('');
                  }
                }}
                getOptionLabel={(option) => {
                  // Display translated subject name in dropdown, but store constant value
                  return translateSubject(option, language);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('topics.subject')}
                    required
                    error={!!errors.subject}
                    helperText={errors.subject}
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={2}></Grid>

            <Grid item xs={12} sm={10}>
              <TextField
                label={t('topics.shortName')}
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                required
                error={!!errors.shortName}
                helperText={errors.shortName}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="outlined"
                size="small"
                startIcon={translating.shortName ? <CircularProgress size={16} /> : translatedField === 'shortName' ? <Refresh /> : <Translate />}
                onClick={translatedField === 'shortName' ? handleRevert : () => handleTranslate('shortName')}
                disabled={translating.shortName || (!shortName.trim() && translatedField !== 'shortName')}
                fullWidth
              >
                {translatedField === 'shortName' ? t('topics.revert') : t('topics.translate')}
              </Button>
            </Grid>

            <Grid item xs={12} sm={10}>
              <TextField
                label={t('topics.taskDescription')}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                required
                error={!!errors.taskDescription}
                helperText={errors.taskDescription}
                multiline
                rows={3}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="outlined"
                size="small"
                startIcon={translating.taskDescription ? <CircularProgress size={16} /> : translatedField === 'taskDescription' ? <Refresh /> : <Translate />}
                onClick={translatedField === 'taskDescription' ? handleRevert : () => handleTranslate('taskDescription')}
                disabled={translating.taskDescription || (!taskDescription.trim() && translatedField !== 'taskDescription')}
                fullWidth
              >
                {translatedField === 'taskDescription' ? t('topics.revert') : t('topics.translate')}
              </Button>
            </Grid>

            <Grid item xs={12} sm={10}>
              <TextField
                label={t('topics.prompt')}
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
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="outlined"
                size="small"
                startIcon={translating.prompt ? <CircularProgress size={16} /> : translatedField === 'prompt' ? <Refresh /> : <Translate />}
                onClick={translatedField === 'prompt' ? handleRevert : () => handleTranslate('prompt')}
                disabled={translating.prompt || (!prompt.trim() && translatedField !== 'prompt')}
                fullWidth
              >
                {translatedField === 'prompt' ? t('topics.revert') : t('topics.translate')}
              </Button>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={10}>
              <FormControl fullWidth>
                <InputLabel>{t('topics.defaultExerciseCount')}</InputLabel>
                <Select
                  value={defaultExerciseCount}
                  label={t('topics.defaultExerciseCount')}
                  onChange={(e) => setDefaultExerciseCount(Number(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <MenuItem key={num} value={num}>
                      {num}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}></Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Button
              variant="outlined"
              startIcon={testingExercise ? <CircularProgress size={16} /> : <Science />}
              onClick={handleTest}
              disabled={testingExercise || !prompt.trim() || !shortName.trim()}
              fullWidth
            >
              {testingExercise ? t('assignments.generating') : testExercise ? t('topics.regenerateTest') : t('topics.testExercise')}
            </Button>

            {testError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {testError}
              </Alert>
            )}

            {testExerciseMarkdown && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {t('topics.testExercisePreview')}
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
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} variant="contained">
          {t('common.save')}
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
