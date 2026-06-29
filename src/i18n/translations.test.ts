import { translateSubject, getSubjectConstant } from './translations';
import { AVAILABLE_SUBJECTS } from '../constants/subjects';

describe('subject translations', () => {
  describe('translateSubject', () => {
    it.each([
      ['math', 'en', 'Math'],
      ['german', 'ru', 'Немецкий язык'],
      ['english', 'de', 'Englisch'],
    ])('translateSubject(%p, %p) => %p', (subject, lang, expected) => {
      expect(translateSubject(subject, lang as 'en' | 'ru' | 'de')).toBe(expected);
    });

    it('returns empty string for empty input', () => {
      expect(translateSubject('')).toBe('');
    });
  });

  describe('getSubjectConstant round-trip', () => {
    it.each(AVAILABLE_SUBJECTS)('constant %p round-trips through en translation', (constant) => {
      const translated = translateSubject(constant, 'en');
      expect(getSubjectConstant(translated)).toBe(constant);
    });

    it.each([
      ['Mathematik', 'math'],
      ['Математика', 'math'],
      ['Englisch', 'english'],
    ])('getSubjectConstant(%p) => %p', (input, expected) => {
      expect(getSubjectConstant(input)).toBe(expected);
    });

    it('returns normalized constant when already a constant', () => {
      expect(getSubjectConstant('MATH')).toBe('math');
    });
  });
});
