import { foldAccents, slugify } from './slugify';

describe('slugify', () => {
  it('drops accents and symbols', () => {
    expect(foldAccents('Papelería')).toBe('papeleria');
    expect(slugify('Té y café')).toBe('te-y-cafe');
    expect(slugify('  ¡Hogar!  ')).toBe('hogar');
  });

  it('falls back when nothing is left and honours the length limit', () => {
    expect(slugify('★★★')).toBe('categoria');
    expect(slugify('a'.repeat(60), 34)).toHaveLength(34);
  });
});
