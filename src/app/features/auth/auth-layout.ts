import { ChangeDetectionStrategy, Component, input } from '@angular/core';

interface Flake {
  x: number;
  y0: number;
  r: number;
  dx: number;
  d: number;
  dl: number;
  o: number;
}

/** Deterministic pseudo-random, so the snow is the same on every visit (and in SSR/tests). */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
const rnd = seeded(20261224);
const FLAKES: Flake[] = Array.from({ length: 22 }, () => {
  const d = 11000 + rnd() * 9000;
  return {
    x: 66 + rnd() * 268,
    y0: 60 + rnd() * 400,
    r: 1 + rnd() * 1.8,
    dx: (rnd() - 0.5) * 36,
    d,
    dl: -rnd() * d, // already mid-fall on arrival: no empty first seconds
    o: 0.35 + rnd() * 0.45,
  };
});

/**
 * Login / register stage: a night panel with the gold window on one side (desktop),
 * the form on cream on the other. On phones, only the form.
 *
 * The window is the hero's sibling, not a copy: instead of the gift on its plinth, a single
 * ornament is lowered on its thread, then sways while snow falls behind the glass and settles on
 * the sill. Calm on purpose (it sits next to a form): 2.5° of sway over 7 s, slow linear snow.
 */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="al">
      <div class="al-night" aria-hidden="true">
        <svg viewBox="0 0 400 520" class="al-arch">
          <defs>
            <clipPath id="alWindow"><path d="M54 520V200a146 146 0 0 1 292 0v320Z" /></clipPath>
            <radialGradient id="alGlow" cx="50%" cy="55%" r="55%">
              <stop offset="0" stop-color="#7a2a3b" stop-opacity=".55" />
              <stop offset="1" stop-color="#3a0f18" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="alBauble" cx="38%" cy="32%" r="75%">
              <stop offset="0" stop-color="#d0566a" />
              <stop offset=".35" stop-color="#a52b3b" />
              <stop offset=".75" stop-color="#641c2b" />
              <stop offset="1" stop-color="#3a0f18" />
            </radialGradient>
            <linearGradient id="alBrass" x1="0" x2="1">
              <stop offset="0" stop-color="#8a6f45" />
              <stop offset=".45" stop-color="#e8cf9c" />
              <stop offset="1" stop-color="#9c7f52" />
            </linearGradient>
          </defs>

          <g clip-path="url(#alWindow)">
            <rect x="54" y="40" width="292" height="480" fill="url(#alGlow)" />
            @for (f of flakes; track $index) {
              <circle
                class="al-flake"
                [attr.cx]="f.x"
                [attr.cy]="f.y0"
                [attr.r]="f.r"
                fill="#f7f1e8"
                [attr.opacity]="f.o"
                [style.--y0]="f.y0 + 'px'"
                [style.--dx]="f.dx + 'px'"
                [style.animation-duration]="f.d + 'ms'"
                [style.animation-delay]="f.dl + 'ms'"
              />
            }

            <g class="al-drop">
              <g class="al-swing">
                <line x1="200" y1="40" x2="200" y2="226" stroke="#b89a65" stroke-width="1" />
                <circle cx="200" cy="229" r="4.5" fill="none" stroke="#e8cf9c" stroke-width="1.4" />
                <rect x="188" y="232" width="24" height="15" rx="2" fill="url(#alBrass)" />
                <circle cx="200" cy="305" r="60" fill="url(#alBauble)" />
                <path d="M141 296q59 26 118 0" fill="none" stroke="#e8cf9c" stroke-width="1.8" />
                <path d="M143 318q57 25 114 0" fill="none" stroke="#e8cf9c" stroke-width=".8" opacity=".7" />
                <g fill="#e8cf9c" opacity=".9">
                  <circle cx="162" cy="314" r="1.6" /><circle cx="181" cy="319" r="1.6" /><circle cx="200" cy="321" r="1.6" />
                  <circle cx="219" cy="319" r="1.6" /><circle cx="238" cy="314" r="1.6" />
                </g>
                <ellipse cx="179" cy="278" rx="13" ry="21" transform="rotate(32 179 278)" fill="#fff6e0" opacity=".28" />
                <path class="al-glint" d="M176 268c.7 6 1.3 6.6 7 7.2-5.7.6-6.3 1.2-7 7.2-.7-6-1.3-6.6-7-7.2 5.7-.6 6.3-1.2 7-7.2z" fill="#fff6e0" />
              </g>
            </g>

            <path d="M54 520v-40q50-16 96-6t104-4q52-12 92 2v48z" fill="#f7f1e8" opacity=".16" />
            <path d="M54 520v-26q60-12 120-2t110-2q36-6 62 2v28z" fill="#f7f1e8" opacity=".38" />
          </g>

          <path d="M40 520V200a160 160 0 0 1 320 0v320" fill="none" stroke="#b89a65" stroke-width="1.6" />
          <path d="M54 520V200a146 146 0 0 1 292 0v320" fill="none" stroke="#b89a65" stroke-width=".8" opacity=".55" />
          <g fill="#e8cf9c">
            <path class="al-tw" d="M116 150c.8 7 1.6 8 9 8.8-7.4.8-8.2 1.6-9 8.8-.8-7.2-1.6-8-9-8.8 7.4-.8 8.2-1.8 9-8.8z" opacity=".9" />
            <path class="al-tw al-tw2" d="M292 132c.6 5 1 5.6 6 6-5 .5-5.4 1-6 6-.5-5-1-5.5-6-6 5-.4 5.5-1 6-6z" opacity=".75" />
            <path class="al-tw al-tw3" d="M300 250c.4 3.4.7 3.8 4 4.2-3.3.3-3.6.7-4 4-.4-3.3-.7-3.7-4-4 3.3-.4 3.6-.8 4-4.2z" opacity=".6" />
          </g>
        </svg>
        <p class="al-mark" lang="en">My Christmas Wishlist</p>
      </div>
      <div class="al-form">
        <div class="al-form-in">
          <h1 class="al-title">{{ heading() }}</h1>
          @if (lede()) {
            <p class="al-lede">{{ lede() }}</p>
          }
          <div class="al-body"><ng-content /></div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .al {
      display: grid;
      min-height: calc(100svh - 64px);
    }
    .al-night {
      display: none;
    }
    .al-form {
      display: grid;
      place-items: center;
      padding: clamp(48px, 9vw, 96px) 16px;
    }
    .al-form-in {
      width: min(100%, 420px);
    }
    .al-title {
      margin: 0;
      font: 400 clamp(40px, 6vw, 60px) / 1 var(--font-display);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .al-lede {
      margin: 16px 0 0;
      font: italic 400 18px/1.55 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .al-body {
      margin-top: 40px;
    }
    @media (min-width: 960px) {
      .al {
        grid-template-columns: 5fr 6fr;
      }
      .al-night {
        position: relative;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 40px;
        padding: 64px;
        background: radial-gradient(70% 60% at 50% 70%, var(--color-night-soft), var(--color-night) 70%);
      }
      .al-arch {
        width: min(70%, 320px);
        height: auto;
        overflow: visible;
      }
      .al-mark {
        margin: 0;
        font: 400 clamp(36px, 3vw, 44px) / 1.1 var(--font-display);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        text-align: center;
        color: var(--color-ivory);
      }
    }

    /* ---------- motion: the panel only exists from 960px, so nothing runs on phones ---------- */
    .al-swing {
      transform-box: view-box;
      transform-origin: 200px 40px; /* the pin at the top of the window */
    }
    .al-glint {
      transform-box: fill-box;
      transform-origin: center;
      opacity: 0;
    }
    @media (prefers-reduced-motion: no-preference) {
      /* Entrance, once per visit: the ornament is lowered into the window on its thread. */
      .al-drop {
        animation: al-drop 1100ms var(--ease-out-strong) 150ms both;
      }
      /* Then it sways: sine segments, out from centre, across, back to centre. */
      .al-swing {
        animation: al-sway 7s linear 1250ms infinite both;
      }
      .al-glint {
        animation: al-glint 6.5s linear 2400ms infinite both;
      }
      .al-flake {
        animation-name: al-fall;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      .al-tw {
        animation: al-twinkle 4.2s var(--ease-float) infinite alternate both;
      }
      .al-tw2 {
        animation-delay: -1.4s;
      }
      .al-tw3 {
        animation-delay: -2.8s;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      /* Same scene, still: the ornament simply fades in; snow rests where it is. */
      .al-drop {
        animation: al-fade 600ms ease-out both;
      }
    }
    @keyframes al-drop {
      from {
        opacity: 0;
        transform: translateY(-90px);
      }
    }
    @keyframes al-sway {
      0% {
        transform: rotate(0deg);
        animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); /* easeOutSine */
      }
      25% {
        transform: rotate(2.5deg);
        animation-timing-function: var(--ease-float);
      }
      75% {
        transform: rotate(-2.5deg);
        animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0); /* easeInSine */
      }
      100% {
        transform: rotate(0deg);
      }
    }
    @keyframes al-fall {
      from {
        transform: translate(0, calc(-20px - var(--y0)));
      }
      to {
        transform: translate(var(--dx), calc(540px - var(--y0)));
      }
    }
    @keyframes al-glint {
      0%,
      82% {
        opacity: 0;
        transform: scale(0.6) rotate(0deg);
      }
      88% {
        opacity: 1;
        transform: scale(1) rotate(45deg);
      }
      94%,
      100% {
        opacity: 0;
        transform: scale(0.7) rotate(90deg);
      }
    }
    @keyframes al-twinkle {
      to {
        opacity: 0.3;
      }
    }
    @keyframes al-fade {
      from {
        opacity: 0;
      }
    }
  `,
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly lede = input<string | null>(null);
  readonly flakes = FLAKES;
}
