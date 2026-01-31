import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { getTopics, deleteTopic } from '../../services/topics';
import { Topic, Subject } from '../../types';
import TopicForm from './TopicForm';

const TopicsScreen: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const allTopics = await getTopics();
      setTopics(allTopics);
    } catch (err: any) {
      setError(err.message || 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTopic(null);
    setFormOpen(true);
  };

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setFormOpen(true);
  };

  const handleDelete = async (topicId: string) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) {
      return;
    }

    try {
      await deleteTopic(topicId);
      await loadTopics();
    } catch (err: any) {
      alert(err.message || 'Failed to delete topic');
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTopic(null);
  };

  const handleFormSave = () => {
    loadTopics();
  };

  const mathTopics = topics.filter((t) => t.subject === 'math');
  const germanTopics = topics.filter((t) => t.subject === 'german');

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Topics</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Create Topic
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
        Math
      </Typography>
      {mathTopics.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No math topics yet
        </Typography>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {mathTopics.map((topic) => (
            <Grid item xs={12} sm={6} md={4} key={topic.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                    <Typography variant="h6">{topic.shortName}</Typography>
                    <Chip label="Math" size="small" color="primary" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {topic.taskDescription}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Prompt: {topic.prompt.substring(0, 50)}...
                  </Typography>
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => handleEdit(topic)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(topic.id)} color="error">
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
        German
      </Typography>
      {germanTopics.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No German topics yet
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {germanTopics.map((topic) => (
            <Grid item xs={12} sm={6} md={4} key={topic.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                    <Typography variant="h6">{topic.shortName}</Typography>
                    <Chip label="German" size="small" color="secondary" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {topic.taskDescription}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Prompt: {topic.prompt.substring(0, 50)}...
                  </Typography>
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => handleEdit(topic)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(topic.id)} color="error">
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <TopicForm
        open={formOpen}
        onClose={handleFormClose}
        onSave={handleFormSave}
        topic={editingTopic}
      />
    </Box>
  );
};

export default TopicsScreen;
