import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toasts } from '../../core/toast';

/** Bottom-centred status messages in a polite live region. */
@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="to" role="status" aria-live="polite">
      @for (t of toasts.items(); track t.id) {
        <div class="to-item" [class.to-error]="t.tone === 'error'" animate.enter="to-in" animate.leave="to-out">
          <span class="to-text">{{ t.text }}</span>
          <button type="button" class="to-x" (click)="toasts.dismiss(t.id)" aria-label="Cerrar aviso">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    .to {
      position: fixed;
      z-index: 60;
      left: 50%;
      bottom: max(16px, env(safe-area-inset-bottom));
      translate: -50% 0;
      display: grid;
      gap: 8px;
      width: min(100% - 32px, 460px);
      pointer-events: none;
    }
    .to-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 6px 6px 20px;
      min-height: 56px;
      background: var(--color-night);
      color: var(--color-ivory);
      border: 1px solid var(--color-gold);
      font-size: 15px;
      line-height: 1.4;
      pointer-events: auto;
    }
    .to-error {
      background: var(--color-cherry);
      border-color: var(--color-cherry);
    }
    .to-text {
      flex: 1;
      padding-block: 8px;
    }
    .to-x {
      width: 44px;
      height: 44px;
      flex: none;
      border: 0;
      background: none;
      color: inherit;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
    }
    .to-in {
      animation: to-in 240ms var(--ease-out-strong) both;
    }
    .to-out {
      animation: to-out 180ms ease-in both;
    }
    @keyframes to-in {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
    }
    @keyframes to-out {
      to {
        opacity: 0;
        transform: translateY(12px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .to-in,
      .to-out {
        animation-name: none;
      }
    }
  `,
})
export class ToastOutlet {
  readonly toasts = inject(Toasts);
}
