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
    <Card 
      elevation={2}
      sx={{ 
        mb: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'secondary.light',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography 
          variant="h5" 
          gutterBottom
          sx={{
            color: 'secondary.main',
            fontWeight: 600,
            mb: 2,
            pb: 1,
            borderBottom: '2px solid',
            borderColor: 'secondary.light',
          }}
        >
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
            sx={{ 
              mb: 3,
              mt: 2,
              py: 1.5,
              px: 4,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Practice
          </Button>
        )}

        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              mb: 2,
            }}
          >
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
        </Box>
      </CardContent>
    </Card>
  );
};

export default SubjectBlock;
