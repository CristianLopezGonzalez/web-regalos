import { formatPrice } from './price-format';

describe('formatPrice', () => {
  it('formats prices in Spanish', () => {
    expect(formatPrice(68, 'EUR').replace(/\s/g, ' ')).toBe('68 €');
    expect(formatPrice(59.9, 'EUR').replace(/\s/g, ' ')).toBe('59,90 €');
  });
});
