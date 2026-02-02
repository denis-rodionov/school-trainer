import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { Subject, Topic, TopicAssignment } from '../../types';
import { getTopics } from '../../services/topics';
import { getSubjectData, updateSubjectTopicAssignments, setSubjectData } from '../../services/users';
import { useLanguage } from '../../contexts/LanguageContext';
import { translateSubject } from '../../i18n/translations';

const DEFAULT_EXERCISE_NUMBER = 3;

interface AssignTopicsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  studentId: string;
}

const AssignTopicsDialog: React.FC<AssignTopicsDialogProps> = ({
  open,
  onClose,
  onSave,
  studentId,
}) => {
  const { t, language } = useLanguage();
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [assignments, setAssignments] = useState<Map<string, TopicAssignment>>(new Map()); // topicId -> assignment
  const [subjectFilter, setSubjectFilter] = useState<Subject>('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const topics = await getTopics();
        setAllTopics(topics);

        // Get unique subjects from topics
        const uniqueSubjects = Array.from(new Set(topics.map((t) => t.subject)));
        setAvailableSubjects(uniqueSubjects);

        // Load current assignments
        const assignmentsMap = new Map<string, TopicAssignment>();

        for (const subject of uniqueSubjects) {
          const subjectData = await getSubjectData(studentId, subject);
          if (subjectData && subjectData.topicAssignments.length > 0) {
            subjectData.topicAssignments.forEach((assignment) => {
              assignmentsMap.set(assignment.topicId, assignment);
            });
          }
        }

        setAssignments(assignmentsMap);
      } catch (err: any) {
        setError(err.message || t('error.failedToLoadData'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, studentId]);

  // Filter topics based on subject and search text
  useEffect(() => {
    let filtered = allTopics;

    // Filter by subject
    if (subjectFilter) {
      filtered = filtered.filter((topic) => topic.subject === subjectFilter);
    }

    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (topic) =>
          topic.shortName.toLowerCase().includes(searchLower) ||
          topic.taskDescription.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTopics(filtered);
  }, [allTopics, subjectFilter, searchText]);

  const handleAssign = async (topic: Topic) => {
    try {
      setError('');
      // Use topic's defaultExerciseCount or fallback to DEFAULT_EXERCISE_NUMBER
      const count = topic.defaultExerciseCount ?? DEFAULT_EXERCISE_NUMBER;

      // Add to local state
      const newAssignments = new Map(assignments);
      newAssignments.set(topic.id, { topicId: topic.id, count });
      setAssignments(newAssignments);

      // Get or create subject data
      const subjectData = await getSubjectData(studentId, topic.subject);
      const currentSubjectAssignments = subjectData?.topicAssignments || [];
      const updatedAssignments = [
        ...currentSubjectAssignments.filter((a) => a.topicId !== topic.id),
        { topicId: topic.id, count },
      ];

      if (subjectData) {
        // Update existing
        await updateSubjectTopicAssignments(studentId, topic.subject, updatedAssignments);
      } else {
        // Create new subject data
        await setSubjectData(studentId, topic.subject, {
          subject: topic.subject,
          topicAssignments: updatedAssignments,
          statistics: {
            worksheetsLast7Days: 0,
          },
        });
      }

      onSave(); // Refresh the parent component
    } catch (err: any) {
      setError(err.message || t('error.failedToAssignTopic'));
      // Revert local state on error
      const newAssignments = new Map(assignments);
      newAssignments.delete(topic.id);
      setAssignments(newAssignments);
    }
  };

  const handleUnassign = async (topic: Topic) => {
    try {
      setError('');

      // Remove from local state
      const newAssignments = new Map(assignments);
      newAssignments.delete(topic.id);
      setAssignments(newAssignments);

      // Update in database
      const subjectData = await getSubjectData(studentId, topic.subject);
      if (subjectData) {
        const updatedAssignments = subjectData.topicAssignments.filter(
          (a) => a.topicId !== topic.id
        );
        await updateSubjectTopicAssignments(studentId, topic.subject, updatedAssignments);
      }

      onSave(); // Refresh the parent component
    } catch (err: any) {
      setError(err.message || t('error.failedToUnassignTopic'));
      // Revert local state on error
      const assignment = assignments.get(topic.id);
      if (assignment) {
        const newAssignments = new Map(assignments);
        newAssignments.set(topic.id, assignment);
        setAssignments(newAssignments);
      }
    }
  };

  const isAssigned = (topicId: string) => assignments.has(topicId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('assignTopics.title')}</DialogTitle>
      <DialogContent
        sx={{
          minHeight: '500px',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <Typography>{t('common.loading')}</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 2, flexShrink: 0 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>{t('assignTopics.filterBySubject')}</InputLabel>
                <Select
                  value={subjectFilter}
                  label={t('assignTopics.filterBySubject')}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                >
                  <MenuItem value="">{t('assignTopics.allSubjects')}</MenuItem>
                  {availableSubjects.map((subject) => (
                    <MenuItem key={subject} value={subject}>
                      {translateSubject(subject, language)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={t('assignTopics.searchTopics')}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('assignTopics.searchPlaceholder')}
              />
            </Box>

            {/* Topics List */}
            <Box 
              sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                overflowX: 'hidden', 
                minHeight: 0,
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                },
              }}
            >
              {filteredTopics.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                  <Typography variant="body2" color="text.secondary">
                    {searchText || subjectFilter
                      ? t('assignTopics.noTopicsFound')
                      : t('assignTopics.noTopicsAvailable')}
                  </Typography>
                </Box>
              ) : (
                <List sx={{ pb: 1, width: '100%' }}>
                {filteredTopics.map((topic) => {
                  const assigned = isAssigned(topic.id);

                  return (
                    <ListItem
                      key={topic.id}
                      sx={{
                        border: '1px solid',
                        borderColor: assigned ? 'success.main' : 'divider',
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: assigned ? 'action.selected' : 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <ListItemText
                        primary={topic.shortName}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {topic.taskDescription}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t('assignTopics.subject')} {translateSubject(topic.subject, language)}
                            </Typography>
                          </Box>
                        }
                        sx={{ flex: 1 }}
                      />
                      <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {assigned ? (
                          <IconButton
                            onClick={() => handleUnassign(topic)}
                            color="error"
                            size="small"
                          >
                            <Remove />
                          </IconButton>
                        ) : (
                          <IconButton
                            onClick={() => handleAssign(topic)}
                            color="primary"
                            size="small"
                          >
                            <Add />
                          </IconButton>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
                </List>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('assignTopics.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignTopicsDialog;
