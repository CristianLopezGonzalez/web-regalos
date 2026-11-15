import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Pwa } from '../../core/pwa';

/**
 * Thin bar pinned to the top while the device has no connection.
 * html.is-offline (styles.css) pushes the page and the sticky header down by its height.
 */
@Component({
  selector: 'app-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" aria-live="polite">
      @if (!pwa.online()) {
        <p class="ob" animate.enter="ob-in" animate.leave="ob-out">
          <span class="ob-dot" aria-hidden="true"></span>
          Sin conexión · no se guardarán cambios
        </p>
      }
    </div>
  `,
  styles: `
    .ob {
      position: fixed;
      z-index: 70;
      inset: 0 0 auto;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-sizing: border-box;
      height: var(--offline-bar-h);
      padding: env(safe-area-inset-top) 16px 0;
      background: var(--color-night);
      color: var(--color-brass);
      border-bottom: 1px solid var(--color-gold);
      font-size: 14px;
      line-height: 1;
      white-space: nowrap;
    }
    .ob-dot {
      width: 8px;
      height: 8px;
      flex: none;
      border-radius: 50%;
      background: var(--color-cherry);
      box-shadow: 0 0 0 2px var(--color-brass);
    }
    .ob-in {
      animation: ob-in 240ms var(--ease-out-strong) both;
    }
    .ob-out {
      animation: ob-out 180ms ease-in both;
    }
    @keyframes ob-in {
      from {
        transform: translateY(-100%);
      }
    }
    @keyframes ob-out {
      to {
        transform: translateY(-100%);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ob-in,
      .ob-out {
        animation-name: none;
      }
    }
  `,
})
export class OfflineBanner {
  readonly pwa = inject(Pwa);

  constructor() {
    effect(() => document.documentElement.classList.toggle('is-offline', !this.pwa.online()));
  }
}
