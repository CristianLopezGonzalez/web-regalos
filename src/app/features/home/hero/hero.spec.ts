import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeaderBrand } from '@app/layout/site-header/header-brand';
import { HERO_SEEN_KEY, Hero, heroSeen } from './hero';

async function render(inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(Hero);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  await fixture.whenStable();
  return fixture;
}

describe('Hero (portada editorial)', () => {
  beforeEach(() => localStorage.removeItem(HERO_SEEN_KEY));

  it('first visit: plays the entrance once and remembers it for next time', async () => {
    expect(heroSeen()).toBe(false);
    const fixture = await render();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList).toContain('hv--play');
    expect(host.classList).not.toContain('hv--rest');
    expect(heroSeen()).toBe(true);
  });

  it('later visits rest on the final frame', async () => {
    localStorage.setItem(HERO_SEEN_KEY, '1');
    const host = (await render()).nativeElement as HTMLElement;
    expect(host.classList).toContain('hv--rest');
    expect(host.classList).not.toContain('hv--play');
  });

  it('the component gallery always shows the final frame and does not count as seen', async () => {
    const host = (await render({ framed: true })).nativeElement as HTMLElement;
    expect(host.classList).toContain('hv--rest');
    expect(heroSeen()).toBe(false);
  });

  it('one real h1 in text, a button straight to its page and no skip/replay controls', async () => {
    const host = (await render({ ctaLink: '/login' })).nativeElement as HTMLElement;
    const h1 = host.querySelectorAll('h1');
    expect(h1.length).toBe(1);
    expect(h1[0].textContent!.replace(/\s+/g, ' ').trim()).toBe('My Christmas Wishlist');
    const cta = host.querySelector<HTMLAnchorElement>('a.hv-cta')!;
    expect(cta.getAttribute('href')).toBe('/login');
    expect(cta.textContent).toContain('Descubre la wishlist');
    expect(host.querySelector('button')).toBeNull();
    expect(host.querySelector('.hv-art')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('gives the header name back when the hero goes away', async () => {
    const fixture = await render();
    const brand = TestBed.inject(HeaderBrand);
    brand.away.set(true);
    fixture.destroy();
    expect(brand.away()).toBe(false);
  });

  it('survives blocked storage (plays, without throwing)', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      expect(heroSeen()).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});
