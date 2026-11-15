import { isHttpsUrl } from './https-url';

describe('isHttpsUrl', () => {
  it('accepts only https purchase links', () => {
    expect(isHttpsUrl('https://tienda.com/x')).toBe(true);
    expect(isHttpsUrl('http://tienda.com/x')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpsUrl('tienda.com')).toBe(false);
  });
});
