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
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

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
            No worksheets yet
          </Typography>
        ) : (
          <List sx={{ pt: 1 }}>
            {worksheets.map((worksheet) => {
              const isPending = worksheet.status === 'pending';
              const dateToFormat = isPending ? worksheet.createdAt : worksheet.completedAt;
              let formattedDate = 'Unknown date';
              if (dateToFormat) {
                let dateObj: Date;
                if (dateToFormat.toDate) {
                  dateObj = dateToFormat.toDate();
                } else if (dateToFormat instanceof Date) {
                  dateObj = dateToFormat;
                } else {
                  dateObj = new Date(dateToFormat as any);
                }
                formattedDate = format(dateObj, 'MMM dd, yyyy');
              }
              const displayDate = isPending 
                ? formatWorksheetDate(worksheet.createdAt)
                : formatWorksheetDate(worksheet.completedAt);

              return (
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
                    primary={formattedDate}
                    secondary={displayDate}
                  />
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {isPending ? (
                      <Chip
                        label="pending"
                        color="warning"
                        size="small"
                        sx={{
                          backgroundColor: '#ffc107',
                          color: '#000',
                          fontWeight: 600,
                        }}
                      />
                    ) : (
                      <>
                        <Chip
                          label={displayDate}
                          color="success"
                          size="small"
                          sx={{
                            backgroundColor: '#4caf50',
                            color: '#fff',
                            fontWeight: 600,
                          }}
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
                          />
                        )}
                      </>
                    )}
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentWorksheets;
