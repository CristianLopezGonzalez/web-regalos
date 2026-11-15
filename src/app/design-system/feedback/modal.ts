import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';

/**
 * Native <dialog> (focus trap, Escape and inert background for free).
 * Opens with a 240 ms rise; closes with a 160 ms fade before the dialog is actually closed.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dlg
      class="md"
      [attr.aria-labelledby]="titleId"
      (cancel)="$event.preventDefault(); requestClose()"
      (click)="onBackdrop($event)"
    >
      <div class="md-panel">
        <h2 class="md-title" [id]="titleId">{{ heading() }}</h2>
        <div class="md-body"><ng-content /></div>
        <div class="md-actions"><ng-content select="[actions]" /></div>
      </div>
    </dialog>
  `,
  styles: `
    .md {
      margin: auto; /* Tailwind's preflight zeroes the browser's centring margin on <dialog> */
      width: min(100% - 32px, 520px);
      max-height: calc(100svh - 48px);
      padding: 0;
      border: 1px solid var(--color-gold);
      outline: 1px solid var(--color-line);
      outline-offset: 6px;
      background: var(--color-ivory);
      color: var(--color-chocolate);
      overflow: visible;
    }
    .md::backdrop {
      background: rgb(58 15 24 / 0.55);
    }
    .md[open] {
      animation: md-in 240ms var(--ease-out-strong) both;
    }
    .md[open]::backdrop {
      animation: md-fade 240ms ease-out both;
    }
    .md.closing {
      animation: md-out 160ms ease-in both;
    }
    .md.closing::backdrop {
      animation: md-fade 160ms ease-in reverse both;
    }
    .md-panel {
      padding: clamp(28px, 5vw, 44px);
      max-height: calc(100svh - 48px);
      overflow: auto;
    }
    .md-title {
      margin: 0 0 16px;
      font: 400 clamp(21px, 3vw, 25px) / 1.2 var(--font-serif);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .md-body {
      font-size: 16px;
      line-height: 1.6;
    }
    .md-actions {
      display: flex;
      flex-wrap: wrap-reverse;
      justify-content: flex-end;
      align-items: center;
      gap: 12px 20px;
      margin-top: 28px;
    }
    @keyframes md-in {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.97);
      }
    }
    @keyframes md-out {
      to {
        opacity: 0;
        transform: scale(0.98);
      }
    }
    @keyframes md-fade {
      from {
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .md[open],
      .md.closing {
        animation-name: md-fade;
      }
      .md.closing {
        animation-direction: reverse;
      }
    }
  `,
})
export class Modal {
  readonly heading = input.required<string>();
  readonly open = model(false);
  /** Block closing (e.g. while a request is in flight). */
  readonly busy = input(false);
  readonly closed = output<void>();

  private static seq = 0;
  readonly titleId = `md-title-${++Modal.seq}`;
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const d = this.dlg().nativeElement;
      if (this.open() && !d.open) {
        d.classList.remove('closing');
        d.showModal();
      } else if (!this.open() && d.open) {
        this.animateClose(d);
      }
    });
  }

  requestClose() {
    if (this.busy()) return;
    this.open.set(false);
  }

  onBackdrop(e: MouseEvent) {
    if (e.target === this.dlg().nativeElement) this.requestClose();
  }

  private animateClose(d: HTMLDialogElement) {
    const done = () => {
      d.classList.remove('closing');
      if (d.open) d.close();
      this.closed.emit();
    };
    d.classList.add('closing');
    setTimeout(done, 170);
  }
}
