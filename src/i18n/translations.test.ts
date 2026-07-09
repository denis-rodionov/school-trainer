import { translateSubject, getSubjectConstant, translations } from './translations';
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

  describe('gutschein translation keys', () => {
    const gutscheinKeys = [
      'gutschein.label',
      'gutschein.defaultWeekly',
      'gutschein.defaultWeeklyLabel',
      'gutschein.addBonus',
      'gutschein.addOne',
      'gutschein.addTwo',
      'gutschein.addCustom',
      'gutschein.saved',
      'gutschein.invalidAmount',
    ];

    it.each(['en', 'ru', 'de'] as const)(
      'all gutschein keys exist in %p',
      (lang) => {
        gutscheinKeys.forEach((key) => {
          expect(translations[lang][key]).toBeTruthy();
        });
      }
    );

    it('uses localized Gutschein term names', () => {
      expect(translations.en['gutschein.label']).toBe('Passes');
      expect(translations.ru['gutschein.label']).toBe('Гутшайн');
      expect(translations.de['gutschein.label']).toBe('Gutscheine');
    });
  });
});
