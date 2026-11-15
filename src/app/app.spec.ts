import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
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
      providers: [
        provideRouter([]),
        { provide: WishlistApi, useClass: DemoApi },
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
      ],
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
    const base = { id: '1', withList: false, emailRestriction: null, createdAt: '', usedAt: null, revokedAt: null };
    const future = new Date(Date.now() + 1e7).toISOString();
    expect(invitationState({ ...base, expiresAt: future })).toBe('pending');
    expect(invitationState({ ...base, expiresAt: '2000-01-01T00:00:00Z' })).toBe('expired');
    expect(invitationState({ ...base, expiresAt: future, usedAt: future })).toBe('used');
    expect(invitationState({ ...base, expiresAt: future, revokedAt: future })).toBe('revoked');
  });
});

describe('two wish lists: the surprise rules (demo backend mirrors the database)', () => {
  const signedInAs = async (email: string) => {
    localStorage.clear();
    sessionStorage.clear();
    const api = TestBed.runInInjectionContext(() => new DemoApi());
    await api.signIn(email, 'navidad');
    return api;
  };

  it('Angela never sees which of her own gifts are reserved, but sees the others', async () => {
    const api = await signedInAs('angela@demo.test');
    const gifts = await api.listGifts();
    const me = api.profile()!.id;
    // In the seed, two of Angela's gifts are reserved (tetera by Mamá, bufanda by Cristian).
    expect(gifts.filter((g) => g.forId === me).some((g) => g.isReserved)).toBe(false);
    expect(gifts.filter((g) => g.forId !== me).some((g) => g.isReserved)).toBe(true);
  }, 20000);

  it('nobody can reserve their own wish, and trying reveals nothing', async () => {
    const api = await signedInAs('angela@demo.test');
    // g-tetera is Angela's AND already reserved: the answer must not be "already reserved".
    await expect(api.reserve('g-tetera')).rejects.toMatchObject({ code: 'CANNOT_RESERVE_OWN_GIFT' });
  }, 20000);

  it('Angela can only edit her own gifts', async () => {
    const api = await signedInAs('angela@demo.test');
    const g = (await api.listGifts()).find((x) => x.id === 'g-reloj')!; // Cristian's
    await expect(api.deleteGift(g.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  }, 20000);

  it('lists are the owner first, then Angela', async () => {
    const api = await signedInAs('mama@demo.test');
    expect((await api.listWishLists()).map((l) => l.name)).toEqual(['Cristian', 'Angela']);
  }, 20000);
});
