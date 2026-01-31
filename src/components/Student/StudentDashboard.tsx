import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { getSubjectData } from '../../services/users';
import { getCompletedWorksheets } from '../../services/worksheets';
import { Subject, SubjectData, Worksheet } from '../../types';
import SubjectBlock from './SubjectBlock';
import { useNavigate } from 'react-router-dom';
import {
  getPendingWorksheetBySubject,
  createWorksheet,
  getExercises,
} from '../../services/worksheets';
import { getTopicsBySubject } from '../../services/topics';
import { getTopic } from '../../services/topics';

// Static exercise templates for each topic
const EXERCISE_TEMPLATES: Record<string, Array<{ markdown: string; answers: string[] }>> = {
  // Math topics
  addition: [
    { markdown: 'Calculate: 5 + 3 = ___', answers: ['8'] },
    { markdown: 'Calculate: 12 + 7 = ___', answers: ['19'] },
    { markdown: 'Calculate: 25 + 15 = ___', answers: ['40'] },
    { markdown: 'Calculate: 8 + 9 = ___', answers: ['17'] },
    { markdown: 'Calculate: 20 + 30 = ___', answers: ['50'] },
  ],
  subtraction: [
    { markdown: 'Calculate: 10 - 4 = ___', answers: ['6'] },
    { markdown: 'Calculate: 15 - 7 = ___', answers: ['8'] },
    { markdown: 'Calculate: 25 - 12 = ___', answers: ['13'] },
    { markdown: 'Calculate: 30 - 15 = ___', answers: ['15'] },
    { markdown: 'Calculate: 50 - 25 = ___', answers: ['25'] },
  ],
  'division-with-remainder': [
    { markdown: 'Calculate: 17 ÷ 5 = ___ remainder ___', answers: ['3', '2'] },
    { markdown: 'Calculate: 23 ÷ 4 = ___ remainder ___', answers: ['5', '3'] },
    { markdown: 'Calculate: 31 ÷ 6 = ___ remainder ___', answers: ['5', '1'] },
    { markdown: 'Calculate: 42 ÷ 8 = ___ remainder ___', answers: ['5', '2'] },
    { markdown: 'Calculate: 19 ÷ 3 = ___ remainder ___', answers: ['6', '1'] },
  ],
  // German topics
  vocabulary: [
    { markdown: 'Translate: "Hello" in German is ___', answers: ['Hallo'] },
    { markdown: 'Translate: "Thank you" in German is ___', answers: ['Danke'] },
    { markdown: 'Translate: "Goodbye" in German is ___', answers: ['Auf Wiedersehen'] },
    { markdown: 'Translate: "Please" in German is ___', answers: ['Bitte'] },
    { markdown: 'Translate: "Yes" in German is ___', answers: ['Ja'] },
  ],
  grammar: [
    { markdown: 'Fill in: "Ich ___ ein Buch" (I read a book)', answers: ['lese'] },
    { markdown: 'Fill in: "Du ___ nach Hause" (You go home)', answers: ['gehst'] },
    { markdown: 'Fill in: "Er ___ gut" (He is good)', answers: ['ist'] },
    { markdown: 'Fill in: "Wir ___ Freunde" (We are friends)', answers: ['sind'] },
    { markdown: 'Fill in: "Sie ___ schön" (She is beautiful)', answers: ['ist'] },
  ],
  'reading-comprehension': [
    { markdown: 'In the text, the main character is called ___.', answers: ['Max'] },
    { markdown: 'The story takes place in ___.', answers: ['Berlin'] },
    { markdown: 'The main event happens on ___.', answers: ['Monday'] },
  ],
};

const StudentDashboard: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [mathData, setMathData] = useState<SubjectData | null>(null);
  const [germanData, setGermanData] = useState<SubjectData | null>(null);
  const [mathWorksheets, setMathWorksheets] = useState<Worksheet[]>([]);
  const [germanWorksheets, setGermanWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser || !userData || userData.role !== 'student') {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [mathSubjectData, germanSubjectData, completedWorksheets] = await Promise.all([
          getSubjectData(currentUser.uid, 'math'),
          getSubjectData(currentUser.uid, 'german'),
          getCompletedWorksheets(currentUser.uid, 10),
        ]);

        setMathData(mathSubjectData);
        setGermanData(germanSubjectData);

        // Separate worksheets by subject (simplified - in real app, we'd need to check exercises)
        // For now, we'll show all worksheets for both subjects
        setMathWorksheets(completedWorksheets);
        setGermanWorksheets(completedWorksheets);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, userData]);

  const handlePractice = async (subject: Subject) => {
    if (!currentUser) return;

    try {
      // Check for pending worksheet
      const pendingWorksheet = await getPendingWorksheetBySubject(currentUser.uid, subject);
      
      if (pendingWorksheet) {
        navigate(`/worksheet/${pendingWorksheet.id}`);
        return;
      }

      // Get subject data with topic assignments
      const subjectData = await getSubjectData(currentUser.uid, subject);
      if (!subjectData || !subjectData.topicAssignments.length) {
        alert('No topics assigned for this subject. Please contact your trainer.');
        return;
      }

      // Get all topics
      const allTopics = await getTopicsBySubject(subject);
      const topicMap = new Map(allTopics.map((t) => [t.id, t]));

      // Generate exercises based on topic assignments
      const exercises: Array<{
        topicId: string;
        topicShortName: string;
        markdown: string;
        correctAnswers: string[];
        order: number;
      }> = [];

      let order = 0;
      for (const assignment of subjectData.topicAssignments) {
        const topic = topicMap.get(assignment.topicId);
        if (!topic) continue;

        // Get templates for this topic (using shortName as key, normalized)
        const topicKey = topic.shortName.toLowerCase().replace(/\s+/g, '-');
        const templates = EXERCISE_TEMPLATES[topicKey] || [];

        // Select random exercises
        const selectedTemplates = [];
        for (let i = 0; i < assignment.count && i < templates.length; i++) {
          const randomIndex = Math.floor(Math.random() * templates.length);
          selectedTemplates.push(templates[randomIndex]);
        }

        // Create exercises
        selectedTemplates.forEach((template) => {
          exercises.push({
            topicId: topic.id,
            topicShortName: topic.shortName,
            markdown: template.markdown,
            correctAnswers: template.answers,
            order: order++,
          });
        });
      }

      if (exercises.length === 0) {
        alert('No exercises available for this subject. Please contact your trainer.');
        return;
      }

      // Create worksheet
      const worksheetId = await createWorksheet(currentUser.uid, exercises);
      navigate(`/worksheet/${worksheetId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create worksheet');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Student Dashboard
      </Typography>
      <SubjectBlock
        subject="math"
        subjectData={mathData}
        worksheets={mathWorksheets}
        onPractice={handlePractice}
      />
      <SubjectBlock
        subject="german"
        subjectData={germanData}
        worksheets={germanWorksheets}
        onPractice={handlePractice}
      />
    </Box>
  );
};

export default StudentDashboard;
