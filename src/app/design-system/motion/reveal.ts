import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * Plays a block's entrance ONCE, when it is really on screen (not when it mounts).
 *
 * Marks the host with `data-rv` and adds `.rv-in` the first time ~15% of it is visible, then
 * `.rv-settled` once the cascade is over (so hover no longer inherits the stagger delays).
 * The CSS lives with each component: hidden state under `[data-rv]:not(.rv-in)`, resting state =
 * normal style, everything as transitions (interruptible). Reduced motion or no
 * IntersectionObserver: shown straight away.
 */
@Directive({
  selector: '[appReveal]',
  host: {
    '[attr.data-rv]': "appReveal() ? '' : null",
    '[class.rv-in]': 'shown()',
    '[class.rv-settled]': 'settled()',
  },
})
export class Reveal {
  /** `appReveal` alone (or true) enables it; false leaves the element alone. */
  readonly appReveal = input(true, { transform: booleanAttribute });

  protected readonly shown = signal(false);
  protected readonly settled = signal(false);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      this.shown.set(true);
      timer = setTimeout(() => this.settled.set(true), 2200);
    };

    afterNextRender(() => {
      if (!this.appReveal()) return;
      const reduce =
        typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || typeof IntersectionObserver === 'undefined') {
        this.shown.set(true);
        this.settled.set(true);
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io.disconnect();
          show();
        },
        { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
      );
      io.observe(el);
      destroyRef.onDestroy(() => io.disconnect());
    });
    destroyRef.onDestroy(() => clearTimeout(timer));
  }
}
