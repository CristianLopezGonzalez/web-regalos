import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderBrand } from '@app/layout/site-header/header-brand';

interface Star {
  x: number;
  y: number;
  wx: number;
  s: number;
}

const SPARK = 'M0,-10 C1,-2 2,-1 10,0 C2,1 1,2 0,10 C-1,2 -2,1 -10,0 C-2,-1 -1,-2 0,-10Z';
/** Set once the entrance has been shown to this person (any later visit rests on the final frame). */
export const HERO_SEEN_KEY = 'mcw-home-intro-seen';

/** Has this browser already seen the full entrance? Storage may be blocked: then it plays. */
export function heroSeen(): boolean {
  try {
    return localStorage.getItem(HERO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
function markHeroSeen() {
  try {
    localStorage.setItem(HERO_SEEN_KEY, '1');
  } catch {
    /* storage blocked: it simply plays again next time */
  }
}

/**
 * HERO — "Portada editorial" (concept C, approved).
 * The cover of a Christmas magazine: cream page, a huge burgundy title on the left, and the
 * midnight shop window as the plate. The night lives only inside the arch.
 *
 * Entrance ≈ 3.2 s, title and button usable at ≈ 1.3 s. CSS keyframes with fill-mode both, so the
 * resting style IS the final frame. Played once per person (localStorage); later visits, the
 * component gallery and reduced motion show the final frame with a short fade. Any "I want to
 * carry on" gesture (wheel, touch drag, a key) completes it at once — no skip button.
 *
 * The scene is three layers (back SVG / small HTML pieces / front SVG) so everything that moves
 * is a small element animated with transform/opacity only (compositor), plus one clip-path wipe.
 */
@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  styleUrl: './hero.css',
  host: {
    class: 'hv',
    '[class.hv--framed]': 'framed()',
    '[class.hv--play]': '!rest() && !framed()',
    '[class.hv--rest]': 'rest() || framed()',
  },
  templateUrl: './hero.html',
})
export class Hero {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly brand = inject(HeaderBrand);
  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');

  /** Fixed-aspect version for the component gallery: always the final frame. */
  readonly framed = input(false);
  readonly ctaLink = input<string | unknown[]>('/wishlist');

  protected readonly spark = SPARK;
  /** true = final frame (seen before, reduced motion, gallery); false = play the entrance. */
  protected readonly rest = signal(
    heroSeen() ||
      (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches),
  );

  protected readonly stars: Star[] = [
    { x: -120, y: -300, wx: 18, s: 1.2 },
    { x: 96, y: -340, wx: -14, s: 0.8 },
    { x: -40, y: -380, wx: 10, s: 0.6 },
    { x: 150, y: -230, wx: 16, s: 1.0 },
    { x: -160, y: -190, wx: -12, s: 0.7 },
    { x: 30, y: -250, wx: -18, s: 1.4 },
    { x: -90, y: -120, wx: 12, s: 0.5 },
    { x: 120, y: -120, wx: -10, s: 0.6 },
    { x: 60, y: -395, wx: 8, s: 0.9 },
  ];

  constructor() {
    const destroyRef = inject(DestroyRef);
    const gestures = new AbortController();
    destroyRef.onDestroy(() => gestures.abort());

    afterNextRender(() => {
      if (this.framed()) return;
      markHeroSeen();

      // Wheel, touch drag or a key (not Tab/Shift: those just move focus) completes the entrance.
      if (!this.rest()) {
        const finish = (e: Event) => {
          if (e instanceof KeyboardEvent && (e.key === 'Tab' || e.key === 'Shift')) return;
          gestures.abort();
          this.finish();
        };
        for (const type of ['wheel', 'touchmove', 'keydown']) {
          addEventListener(type, finish, { passive: true, signal: gestures.signal });
        }
      }

      // The header's small name steps aside while this big title is on screen.
      destroyRef.onDestroy(() => this.brand.away.set(false));
      if (typeof IntersectionObserver === 'undefined') {
        this.brand.away.set(false);
        return;
      }
      const io = new IntersectionObserver(([e]) => this.brand.away.set(e.isIntersecting), {
        rootMargin: '-64px 0px 0px 0px', // under the sticky header
      });
      io.observe(this.title().nativeElement);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }

  /** Jump every entrance animation to its last frame (scroll-linked ones are left alone). */
  finish() {
    for (const a of this.host.getAnimations?.({ subtree: true }) ?? []) {
      if (a.timeline !== document.timeline) continue;
      const end = a.effect?.getComputedTiming().endTime;
      if (end != null && end !== Infinity) a.finish();
    }
  }
}
