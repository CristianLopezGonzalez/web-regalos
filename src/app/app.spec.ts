import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { DemoApi } from './core/demo-api';
import { invitationState } from './core/models';
import { formatPrice, isHttpsUrl } from './core/format';
import { safeNext } from './core/session';
import { WishlistApi } from './core/wishlist-api';

describe('App', () => {
  it('creates the shell', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: WishlistApi, useClass: DemoApi }],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('helpers', () => {
  it('accepts only https purchase links', () => {
    expect(isHttpsUrl('https://tienda.com/x')).toBe(true);
    expect(isHttpsUrl('http://tienda.com/x')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpsUrl('tienda.com')).toBe(false);
  });

  it('only allows same-site redirects after login', () => {
    expect(safeNext('/wishlist')).toBe('/wishlist');
    expect(safeNext('//evil.com')).toBeNull();
    expect(safeNext(String.raw`/\evil.com`)).toBeNull();
    expect(safeNext('https://evil.com')).toBeNull();
  });

  it('formats prices in Spanish', () => {
    expect(formatPrice(68, 'EUR').replace(/\s/g, ' ')).toBe('68 €');
    expect(formatPrice(59.9, 'EUR').replace(/\s/g, ' ')).toBe('59,90 €');
  });

  it('derives invitation state', () => {
    const base = { id: '1', emailRestriction: null, createdAt: '', usedAt: null, revokedAt: null };
    const future = new Date(Date.now() + 1e7).toISOString();
    expect(invitationState({ ...base, expiresAt: future })).toBe('pending');
    expect(invitationState({ ...base, expiresAt: '2000-01-01T00:00:00Z' })).toBe('expired');
    expect(invitationState({ ...base, expiresAt: future, usedAt: future })).toBe('used');
    expect(invitationState({ ...base, expiresAt: future, revokedAt: future })).toBe('revoked');
  });
});
