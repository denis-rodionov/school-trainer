import { validateAndConvertToHtmlMarkdown } from './aiMarkdownConverter';
import { extractCorrectAnswers } from './markdownParser';

describe('aiMarkdownConverter', () => {
  it('converts single gap to input tag', () => {
    const result = validateAndConvertToHtmlMarkdown('4+2=____ (6)');
    expect(result.valid).toBe(true);
    expect(result.htmlMarkdown).toBe('<p>4+2=<input data-answer="6"/></p>');
    expect(extractCorrectAnswers(result.htmlMarkdown!)).toEqual(['6']);
  });

  it('converts multiple gaps', () => {
    const result = validateAndConvertToHtmlMarkdown('5 + ____ (3) = 8');
    expect(result.valid).toBe(true);
    expect(result.htmlMarkdown).toContain('data-answer="3"');
  });

  it('escapes HTML in answers', () => {
    const result = validateAndConvertToHtmlMarkdown('Say ____ (Tom & Jerry)');
    expect(result.valid).toBe(true);
    expect(result.htmlMarkdown).toContain('data-answer="Tom &amp; Jerry"');
  });

  it('rejects text without gaps', () => {
    const result = validateAndConvertToHtmlMarkdown('No gaps here');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/without any gaps/i);
  });

  it('rejects gaps missing parenthesized answers', () => {
    const result = validateAndConvertToHtmlMarkdown('2+2=____ and 3+3=____ (6)');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/only 1 answer/i);
  });

  it('does not wrap when result already starts with HTML tag', () => {
    const result = validateAndConvertToHtmlMarkdown('<div>____ (1)</div>');
    expect(result.valid).toBe(true);
    expect(result.htmlMarkdown).toMatch(/^<div>/);
  });
});
