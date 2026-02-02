import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { SubjectData, Subject } from '../../types';
import { getTopic } from '../../services/topics';
import { useEffect, useState } from 'react';
import { Topic } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface TopicAssignmentsProps {
  subject: Subject;
  subjectData: SubjectData | null;
  isReadOnly?: boolean;
}

const TopicAssignments: React.FC<TopicAssignmentsProps> = ({
  subject,
  subjectData,
  isReadOnly = false,
}) => {
  const { t } = useLanguage();
  const [topics, setTopics] = useState<Map<string, Topic>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTopics = async () => {
      if (!subjectData || !subjectData.topicAssignments.length) {
        setLoading(false);
        return;
      }

      try {
        const topicPromises = subjectData.topicAssignments.map((assignment) =>
          getTopic(assignment.topicId)
        );
        const loadedTopics = await Promise.all(topicPromises);
        const topicMap = new Map<string, Topic>();
        
        loadedTopics.forEach((topic, index) => {
          if (topic) {
            topicMap.set(subjectData.topicAssignments[index].topicId, topic);
          }
        });
        
        setTopics(topicMap);
      } catch (err) {
        console.error('Failed to load topics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, [subjectData]);

  if (loading) {
    return <Typography variant="body2">{t('common.loading')}</Typography>;
  }

  if (!subjectData || !subjectData.topicAssignments.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('dashboard.noAssignments')}
      </Typography>
    );
  }

  return (
    <Paper 
      elevation={3}
      sx={{ 
        p: 3, 
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'primary.light',
      }}
    >
      <Typography 
        variant="h6" 
        gutterBottom
        sx={{
          color: 'primary.main',
          fontWeight: 600,
          mb: 2,
          pb: 1,
          borderBottom: '2px solid',
          borderColor: 'primary.light',
        }}
      >
        {t('assignments.title')}
      </Typography>
      <List sx={{ pt: 1 }}>
        {subjectData.topicAssignments.map((assignment) => {
          const topic = topics.get(assignment.topicId);
          return (
            <ListItem
              key={assignment.topicId}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <ListItemText
                primary={topic?.shortName || `${t('topics.title')} ${assignment.topicId}`}
                secondary={topic?.taskDescription || t('assignments.noDescription')}
              />
              <Chip
                label={`${assignment.count} ${t('assignments.exercises')}`}
                size="small"
                color="primary"
              />
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
};

export default TopicAssignments;
