import { Component, ElementRef, effect, input, model, output, viewChild } from '@angular/core';

/**
 * Native <dialog> (focus trap, Escape and inert background for free).
 * Opens with a 240 ms rise; closes with a 160 ms fade before the dialog is actually closed.
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  readonly heading = input.required<string>();
  readonly open = model(false);
  /** Block closing (e.g. while a request is in flight). */
  readonly busy = input(false);
  /** Wider panel (forms with two columns). */
  readonly wide = input(false);
  /** On phones, a sheet that rises from the bottom instead of a centred box. */
  readonly sheet = input(false);

  readonly closed = output<void>();

  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  private static seq = 0;
  protected readonly titleId = `md-title-${++Modal.seq}`;

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

  protected requestClose() {
    if (this.busy()) return;
    this.open.set(false);
  }

  protected onBackdrop(e: MouseEvent) {
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
