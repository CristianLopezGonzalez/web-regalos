import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Login / register stage: a night panel with the gold window on one side (desktop),
 * the form on cream on the other. On phones, only the form, under a small arch.
 */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="al">
      <div class="al-night" aria-hidden="true">
        <svg viewBox="0 0 400 520" class="al-arch">
          <path d="M40 520V200a160 160 0 0 1 320 0v320" fill="none" stroke="#b89a65" stroke-width="1.6" />
          <path d="M54 520V200a146 146 0 0 1 292 0v320" fill="none" stroke="#b89a65" stroke-width=".8" opacity=".55" />
          <g fill="#e8cf9c">
            <path d="M200 150c1 9 2 10 11 11-9 1-10 2-11 11-1-9-2-10-11-11 9-1 10-2 11-11z" />
            <path d="M136 236c.6 5 1 5.6 6 6-5 .5-5.4 1-6 6-.5-5-1-5.5-6-6 5-.4 5.5-1 6-6z" opacity=".7" />
            <path d="M268 210c.6 5 1 5.6 6 6-5 .5-5.4 1-6 6-.5-5-1-5.5-6-6 5-.4 5.5-1 6-6z" opacity=".8" />
            <path d="M240 300c.4 3.4.7 3.8 4 4.2-3.3.3-3.6.7-4 4-.4-3.3-.7-3.7-4-4 3.3-.4 3.6-.8 4-4.2z" opacity=".6" />
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
  `,
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly lede = input<string | null>(null);
}
