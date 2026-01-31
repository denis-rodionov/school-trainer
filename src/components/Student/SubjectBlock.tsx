import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Subject, SubjectData, Worksheet } from '../../types';
import { formatWorksheetDate } from '../../utils/dateUtils';

interface SubjectBlockProps {
  subject: Subject;
  subjectData: SubjectData | null;
  worksheets: Worksheet[];
  onPractice: (subject: Subject) => void;
  isReadOnly?: boolean;
}

const SubjectBlock: React.FC<SubjectBlockProps> = ({
  subject,
  subjectData,
  worksheets,
  onPractice,
  isReadOnly = false,
}) => {
  const navigate = useNavigate();
  const subjectName = subject === 'math' ? 'Math' : 'German';

  const handleWorksheetClick = (worksheetId: string) => {
    navigate(`/worksheet/${worksheetId}`);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          {subjectName}
        </Typography>

        {subjectData && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Worksheets completed in last 7 days: {subjectData.statistics.worksheetsLast7Days}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last worksheet: {formatWorksheetDate(subjectData.statistics.lastWorksheetDate)}
            </Typography>
          </Box>
        )}

        {!isReadOnly && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => onPractice(subject)}
            sx={{ mb: 2 }}
          >
            Practice
          </Button>
        )}

        <Typography variant="h6" gutterBottom>
          Recent Worksheets
        </Typography>
        {worksheets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No completed worksheets yet
          </Typography>
        ) : (
          <List>
            {worksheets.map((worksheet) => (
              <ListItem
                key={worksheet.id}
                button
                onClick={() => handleWorksheetClick(worksheet.id)}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                <ListItemText
                  primary={`Worksheet ${worksheet.id.slice(0, 8)}`}
                  secondary={formatWorksheetDate(worksheet.completedAt)}
                />
                {worksheet.score !== undefined && (
                  <Chip
                    label={`${Math.round(worksheet.score)}%`}
                    color={worksheet.score >= 80 ? 'success' : worksheet.score >= 60 ? 'warning' : 'error'}
                    size="small"
                  />
                )}
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default SubjectBlock;
