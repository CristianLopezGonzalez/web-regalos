import {
  ChangeDetectionStrategy,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './hero.css',
  host: { class: 'hv', '[class.hv--framed]': 'framed()', '[class.hv--rest]': 'rest()' },
  template: `
    @for (k of [run()]; track k) {
      <div class="hv-stage">
        <div class="hv-flood" aria-hidden="true"></div>

        <p class="hv-line">Una pequeña colección de deseos de Navidad</p>

        <div class="hv-brand">
          <h1 class="hv-title" lang="en">
            <span class="hv-mask"><span class="hv-w hv-w1">My</span></span>
            <span class="hv-mask"><span class="hv-w hv-w2">Christmas</span></span>
            <span class="hv-mask"><span class="hv-w hv-w3">Wishlist</span></span>
          </h1>
          <p class="hv-sub">Un poco de magia, muchos deseos.</p>
          @if (ctaFragment()) {
            <a class="hv-cta" [routerLink]="[]" [fragment]="ctaFragment()!">Descubre mi wishlist</a>
          } @else {
            <a class="hv-cta" [routerLink]="ctaLink()">Descubre mi wishlist</a>
          }
        </div>

        <div class="hv-art">
          <svg viewBox="0 0 600 640" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="hvVelvet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#5e1b2a" />
                <stop offset="1" stop-color="#2c0a12" />
              </linearGradient>
              <linearGradient id="hvSpot" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#fff4da" stop-opacity=".0" />
                <stop offset=".25" stop-color="#fff4da" stop-opacity=".35" />
                <stop offset="1" stop-color="#fff4da" stop-opacity=".05" />
              </linearGradient>
              <radialGradient id="hvPool" cx="50%" cy="50%" r="50%">
                <stop offset="0" stop-color="#fff4da" stop-opacity=".7" />
                <stop offset="1" stop-color="#fff4da" stop-opacity="0" />
              </radialGradient>
              <linearGradient id="hvPaper" x1="0" x2="1">
                <stop offset="0" stop-color="#7a2a3b" />
                <stop offset=".5" stop-color="#641c2b" />
                <stop offset="1" stop-color="#4e1522" />
              </linearGradient>
              <linearGradient id="hvSatin" x1="0" x2="1">
                <stop offset="0" stop-color="#7d1d2b" />
                <stop offset=".38" stop-color="#c4485a" />
                <stop offset=".52" stop-color="#a52b3b" />
                <stop offset="1" stop-color="#761a28" />
              </linearGradient>
              <radialGradient id="hvGlow" cx="50%" cy="60%" r="60%">
                <stop offset="0" stop-color="#fff6e0" stop-opacity="1" />
                <stop offset=".5" stop-color="#f3dcae" stop-opacity=".45" />
                <stop offset="1" stop-color="#f3dcae" stop-opacity="0" />
              </radialGradient>
              <clipPath id="hvArchClip">
                <path d="M96,640 L96,262 A204,204 0 0 1 504,262 L504,640 Z" />
              </clipPath>
            </defs>

            <path class="hv-window" d="M96,640 L96,262 A204,204 0 0 1 504,262 L504,640 Z" fill="url(#hvVelvet)" />

            <g clip-path="url(#hvArchClip)">
              <polygon class="hv-spot" points="262,40 338,40 470,584 130,584" fill="url(#hvSpot)" />
              @for (s of stars; track $index) {
                <g class="hv-star" [style.--x]="s.x + 'px'" [style.--y]="s.y + 'px'" [style.--wx]="s.wx + 'px'" [style.--s]="s.s" [style.--d]="s.d + 'ms'" [style.--dl]="s.dl + 'ms'">
                  <path [attr.d]="spark" fill="#d8bf8c" transform="translate(300 470)" />
                </g>
              }
            </g>

            <path class="hv-arch" pathLength="1" d="M96,640 L96,262 A204,204 0 0 1 504,262 L504,640" fill="none" stroke="#b89a65" stroke-width="2.4" />
            <path class="hv-arch hv-arch-2" pathLength="1" d="M112,640 L112,262 A188,188 0 0 1 488,262 L488,640" fill="none" stroke="#b89a65" stroke-width="1" />

            <g class="hv-plinth">
              <ellipse class="hv-pool" cx="300" cy="566" rx="150" ry="26" fill="url(#hvPool)" />
              <rect x="186" y="566" width="228" height="74" fill="#efe5d6" />
              <rect x="186" y="566" width="228" height="74" fill="#332421" opacity=".06" />
              <ellipse cx="300" cy="566" rx="114" ry="14" fill="#fcfaf6" />
              <ellipse cx="300" cy="566" rx="114" ry="14" fill="none" stroke="#b89a65" stroke-width="1.2" />
            </g>

            <g class="hv-box">
              <g class="hv-hop">
                <ellipse class="hv-glow" cx="300" cy="438" rx="150" ry="110" fill="url(#hvGlow)" />
                <g class="hv-body">
                  <rect x="212" y="438" width="176" height="128" fill="url(#hvPaper)" />
                  <rect x="212" y="438" width="176" height="10" fill="#2a0b11" opacity=".55" />
                  <rect x="282" y="438" width="36" height="128" fill="url(#hvSatin)" />
                  <rect x="212.75" y="438.75" width="174.5" height="126.5" fill="none" stroke="#b89a65" stroke-opacity=".7" stroke-width="1.5" />
                </g>
                <g transform="translate(300 446)">
                  @for (k of sparks; track $index) {
                    <g class="hv-spark" [style.--a]="k.a + 'deg'" [style.--len]="k.len + 'px'" [style.--dl]="k.dl + 'ms'">
                      <rect x="-1" y="-10" width="2" height="10" fill="#d8bf8c" />
                    </g>
                  }
                </g>
                <g class="hv-lid-bob">
                  <g class="hv-lid">
                    <rect x="202" y="410" width="196" height="36" rx="2" fill="url(#hvPaper)" />
                    <rect x="202" y="440" width="196" height="6" fill="#2a0b11" opacity=".45" />
                    <rect x="282" y="410" width="36" height="36" fill="url(#hvSatin)" />
                    <rect x="202.75" y="410.75" width="194.5" height="34.5" rx="2" fill="none" stroke="#b89a65" stroke-opacity=".7" stroke-width="1.5" />
                    <path class="hv-tail hv-tail-l" d="M297,410 C290,428 280,448 266,466 L278,472 C289,454 298,434 304,413 Z" fill="url(#hvSatin)" />
                    <path class="hv-tail hv-tail-r" d="M303,410 C310,428 320,448 334,466 L322,472 C311,454 302,434 296,413 Z" fill="url(#hvSatin)" />
                    <path d="M300,408 C274,368 226,366 234,394 C239,412 274,413 300,408 Z" fill="url(#hvSatin)" />
                    <path d="M300,408 C326,368 374,366 366,394 C361,412 326,413 300,408 Z" fill="url(#hvSatin)" />
                    <ellipse cx="300" cy="409" rx="13" ry="10" fill="#b23545" />
                  </g>
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>
    }
    @if (!done()) {
      <button type="button" class="hv-skip" (click)="skip()">Saltar intro</button>
    } @else if (!framed() && !reduce) {
      <button type="button" class="hv-replay" (click)="replay()">Ver la intro otra vez</button>
    }
  `,
})
export class Hero {
  /** Fixed-aspect version for the component gallery. */
  readonly framed = input(false);
  readonly ctaLink = input<string | unknown[]>('/wishlist');
  /** When set, the CTA scrolls to this fragment on the same page instead. */
  readonly ctaFragment = input<string | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly spark = SPARK;
  readonly run = signal(0);
  readonly rest = signal(false);
  readonly done = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;
  readonly reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  readonly stars: Star[] = [
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
  readonly sparks: Spark[] = [-70, -45, -20, 0, 20, 45, 70, -90, 90].map((a, i) => ({
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

  skip() {
    for (const a of this.host.nativeElement.getAnimations({ subtree: true })) {
      const end = a.effect?.getComputedTiming().endTime;
      if (end != null && end !== Infinity) a.finish();
    }
    clearTimeout(this.timer);
    this.done.set(true);
  }

  replay() {
    this.rest.set(false);
    this.run.update((v) => v + 1);
    this.start();
  }
}
