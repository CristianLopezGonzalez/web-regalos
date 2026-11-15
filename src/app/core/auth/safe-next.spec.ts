import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('only allows same-site redirects after login', () => {
    expect(safeNext('/wishlist')).toBe('/wishlist');
    expect(safeNext('//evil.com')).toBeNull();
    expect(safeNext(String.raw`/\evil.com`)).toBeNull();
    expect(safeNext('https://evil.com')).toBeNull();
  });
});
