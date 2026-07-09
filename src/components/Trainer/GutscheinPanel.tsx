import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Snackbar,
  Alert,
} from '@mui/material';
import { Subject, SubjectGutscheins } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  addBonusGutscheins,
  setDefaultWeeklyGutscheins,
} from '../../services/gutscheinService';

export const GUTSCHEIN_ICON = '🎟️';

interface GutscheinPanelProps {
  subject: Subject;
  gutscheins: SubjectGutscheins;
  isTrainerMode?: boolean;
  studentId?: string;
  onUpdate?: () => void;
}

const GutscheinPanel: React.FC<GutscheinPanelProps> = ({
  subject,
  gutscheins,
  isTrainerMode = false,
  studentId,
  onUpdate,
}) => {
  const { t } = useLanguage();
  const [defaultWeekly, setDefaultWeekly] = useState(String(gutscheins.defaultWeekly));
  const [customAmount, setCustomAmount] = useState('1');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDefaultWeekly(String(gutscheins.defaultWeekly));
  }, [gutscheins.defaultWeekly, gutscheins.balance]);

  const weeklyLabel = t('gutschein.defaultWeeklyLabel').replace(
    '{count}',
    String(gutscheins.defaultWeekly)
  );

  const handleSaveDefault = async () => {
    if (!studentId) return;
    const value = parseInt(defaultWeekly, 10);
    if (Number.isNaN(value) || value < 0) {
      setError(t('gutschein.invalidAmount'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      await setDefaultWeeklyGutscheins(studentId, subject, value);
      setSaved(true);
      onUpdate?.();
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddBonus = async (amount: number) => {
    if (!studentId || amount <= 0) return;

    setSaving(true);
    setError('');
    try {
      await addBonusGutscheins(studentId, subject, amount);
      setSaved(true);
      onUpdate?.();
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustom = async () => {
    const amount = parseInt(customAmount, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      setError(t('gutschein.invalidAmount'));
      return;
    }
    await handleAddBonus(amount);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label={`${GUTSCHEIN_ICON} ${gutscheins.balance} ${t('gutschein.label')}`}
          color="primary"
          variant="outlined"
          sx={{ fontSize: '1rem', py: 2, px: 0.5 }}
        />
        {isTrainerMode && (
          <Typography variant="body2" color="text.secondary">
            {weeklyLabel}
          </Typography>
        )}
      </Box>

      {isTrainerMode && studentId && (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              label={t('gutschein.defaultWeekly')}
              type="number"
              size="small"
              value={defaultWeekly}
              onChange={(e) => setDefaultWeekly(e.target.value)}
              inputProps={{ min: 0 }}
              sx={{ width: 160 }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleSaveDefault}
              disabled={saving}
            >
              {t('common.save')}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            {t('gutschein.addBonus')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleAddBonus(1)}
              disabled={saving}
            >
              {GUTSCHEIN_ICON} {t('gutschein.addOne')}
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleAddBonus(2)}
              disabled={saving}
            >
              {GUTSCHEIN_ICON} {t('gutschein.addTwo')}
            </Button>
            <TextField
              type="number"
              size="small"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              inputProps={{ min: 1 }}
              sx={{ width: 80 }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleAddCustom}
              disabled={saving}
            >
              {t('gutschein.addCustom')}
            </Button>
          </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={saved}
        autoHideDuration={2000}
        onClose={() => setSaved(false)}
        message={t('gutschein.saved')}
      />
    </Box>
  );
};

export default GutscheinPanel;
