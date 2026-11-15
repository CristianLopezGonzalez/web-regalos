import {
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

interface Star {
  x: number;
  y: number;
  wx: number;
  s: number;
  d: number;
  dl: number;
}
interface Spark {
  a: number;
  len: number;
  dl: number;
}

const SPARK = 'M0,-10 C1,-2 2,-1 10,0 C2,1 1,2 0,10 C-1,2 -2,1 -10,0 C-2,-1 -1,-2 0,-10Z';
const PLAYED_KEY = 'mcw-hero-played';
const TOTAL_MS = 6000;

/**
 * HERO — "The Midnight Window"
 * A shop window at dusk: a gold arch draws itself, the gift is set on a plinth under a
 * spotlight, hops twice, opens, and night floods out of it while stars rise.
 *
 * Built as inline SVG + CSS keyframes (fill-mode both, so the resting style IS the final
 * frame). That gives the static alternative for reduced motion, and "skip" through the Web
 * Animations API. The full sequence plays once per session; afterwards it rests on the final frame.
 */
@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  encapsulation: ViewEncapsulation.None,
  styleUrl: './hero.css',
  host: { class: 'hv', '[class.hv--framed]': 'framed()', '[class.hv--rest]': 'rest()' },
  templateUrl: './hero.html',
})
export class Hero {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Fixed-aspect version for the component gallery. */
  readonly framed = input(false);
  readonly ctaLink = input<string | unknown[]>('/wishlist');
  /** When set, the CTA scrolls to this fragment on the same page instead. */
  readonly ctaFragment = input<string | null>(null);

  protected readonly spark = SPARK;
  protected readonly run = signal(0);
  protected readonly rest = signal(false);
  protected readonly done = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;
  protected readonly reduce =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected readonly stars: Star[] = [
    { x: -120, y: -300, wx: 18, s: 1.2, d: 2400, dl: 3050 },
    { x: 96, y: -340, wx: -14, s: 0.8, d: 2500, dl: 3120 },
    { x: -40, y: -380, wx: 10, s: 0.6, d: 2600, dl: 3240 },
    { x: 150, y: -230, wx: 16, s: 1.0, d: 2300, dl: 3080 },
    { x: -160, y: -190, wx: -12, s: 0.7, d: 2200, dl: 3200 },
    { x: 30, y: -250, wx: -18, s: 1.4, d: 2400, dl: 3160 },
    { x: -90, y: -120, wx: 12, s: 0.5, d: 2100, dl: 3300 },
    { x: 120, y: -120, wx: -10, s: 0.6, d: 2200, dl: 3340 },
    { x: 60, y: -395, wx: 8, s: 0.9, d: 2600, dl: 3380 },
    { x: -140, y: -370, wx: -8, s: 0.55, d: 2500, dl: 3260 },
  ];
  protected readonly sparks: Spark[] = [-70, -45, -20, 0, 20, 45, 70, -90, 90].map((a, i) => ({
    a,
    len: 70 + (i % 3) * 22,
    dl: 2990 + (i % 4) * 30,
  }));

  constructor() {
    let played = false;
    try {
      played = sessionStorage.getItem(PLAYED_KEY) === '1';
    } catch {
      /* storage blocked: play every time */
    }
    if (played || this.reduce) {
      this.rest.set(true);
      this.done.set(true);
    } else {
      this.start();
    }
    afterNextRender(() => {
      try {
        sessionStorage.setItem(PLAYED_KEY, '1');
      } catch {
        /* ignore */
      }
    });
  }

  private start() {
    this.done.set(false);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.done.set(true), TOTAL_MS);
  }

  protected skip() {
    for (const a of this.host.nativeElement.getAnimations({ subtree: true })) {
      const end = a.effect?.getComputedTiming().endTime;
      if (end != null && end !== Infinity) a.finish();
    }
    clearTimeout(this.timer);
    this.done.set(true);
  }

  protected replay() {
    this.rest.set(false);
    this.run.update((v) => v + 1);
    this.start();
  }
}
