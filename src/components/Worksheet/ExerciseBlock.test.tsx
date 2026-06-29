jest.mock('../../contexts/LanguageContext', () => {
  const { getTranslation } = require('../../i18n/translations');
  return {
    useLanguage: () => ({
      language: 'en' as const,
      setLanguage: jest.fn().mockResolvedValue(undefined),
      t: (key: string) => getTranslation(key, 'en'),
    }),
  };
});

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import ExerciseBlock from './ExerciseBlock';
import { renderWithProviders } from '../../test/renderWithProviders';
import { sampleFillGapsExercise, sampleMultiGapExercise } from '../../test/fixtures';

describe('ExerciseBlock', () => {
  it('renders text and input fields from markdown gaps', () => {
    renderWithProviders(
      <ExerciseBlock
        exercise={sampleFillGapsExercise}
        answers={['']}
        onAnswerChange={jest.fn()}
      />
    );
    expect(screen.getByText(/4\+2=/)).toBeInTheDocument();
    expect(document.querySelector('input')).toBeInTheDocument();
  });

  it('calls onAnswerChange when student types an answer', () => {
    const onAnswerChange = jest.fn();
    renderWithProviders(
      <ExerciseBlock
        exercise={sampleFillGapsExercise}
        answers={['']}
        onAnswerChange={onAnswerChange}
      />
    );
    fireEvent.change(document.querySelector('input')!, { target: { value: '6' } });
    expect(onAnswerChange).toHaveBeenCalledWith(0, '6');
  });

  it('renders multiple gap inputs for multi-gap exercises', () => {
    renderWithProviders(
      <ExerciseBlock
        exercise={sampleMultiGapExercise}
        answers={['', '']}
        onAnswerChange={jest.fn()}
      />
    );
    expect(document.querySelectorAll('input')).toHaveLength(2);
  });

  it('uses number input type for numeric answers', () => {
    renderWithProviders(
      <ExerciseBlock
        exercise={sampleFillGapsExercise}
        answers={['']}
        onAnswerChange={jest.fn()}
      />
    );
    expect(document.querySelector('input')).toHaveAttribute('type', 'number');
  });
});
