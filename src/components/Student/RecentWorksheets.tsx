import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Worksheet } from '../../types';
import { formatWorksheetDate } from '../../utils/dateUtils';

interface RecentWorksheetsProps {
  worksheets: Worksheet[];
  subjectName: string;
}

const RecentWorksheets: React.FC<RecentWorksheetsProps> = ({
  worksheets,
  subjectName,
}) => {
  const navigate = useNavigate();

  const handleWorksheetClick = (worksheetId: string) => {
    navigate(`/worksheet/${worksheetId}`);
  };

  return (
    <Card
      elevation={3}
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            mb: 2,
            pb: 1.5,
            borderBottom: '2px solid',
            borderColor: 'primary.main',
          }}
        >
          Recent Worksheets - {subjectName}
        </Typography>

        {worksheets.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No completed worksheets yet
          </Typography>
        ) : (
          <List sx={{ pt: 1 }}>
            {worksheets.map((worksheet) => (
              <ListItem
                key={worksheet.id}
                button
                onClick={() => handleWorksheetClick(worksheet.id)}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    borderColor: 'primary.main',
                  },
                  transition: 'all 0.2s',
                }}
              >
                <ListItemText
                  primary={`Worksheet ${worksheet.id.slice(0, 8)}`}
                  secondary={formatWorksheetDate(worksheet.completedAt)}
                />
                {worksheet.score !== undefined && (
                  <Chip
                    label={`${Math.round(worksheet.score)}%`}
                    color={
                      worksheet.score >= 80
                        ? 'success'
                        : worksheet.score >= 60
                        ? 'warning'
                        : 'error'
                    }
                    size="small"
                    sx={{ ml: 1 }}
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

export default RecentWorksheets;
