import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { GiftImage } from '../../core/models';

/**
 * A product photo shown as if in a lit shop window: ivory ground, light from above,
 * `multiply` so white studio backgrounds melt into the ivory. Shape: arched window or plain.
 */
@Component({
  selector: 'app-product-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"pi pi--" + shape()', '[class.pi--dim]': 'dim()' },
  template: `
    @if (image() && !failed()) {
      <img
        [src]="image()!.md"
        [attr.srcset]="srcset()"
        [sizes]="sizes()"
        [alt]="alt()"
        [attr.loading]="eager() ? 'eager' : 'lazy'"
        [attr.fetchpriority]="eager() ? 'high' : null"
        decoding="async"
        (error)="failed.set(true)"
      />
    } @else {
      <svg class="pi-empty" viewBox="0 0 80 80" role="img" [attr.aria-label]="alt() + ' (sin foto)'">
        <rect x="16" y="34" width="48" height="34" fill="none" stroke="currentColor" stroke-width="1.2" />
        <rect x="12" y="26" width="56" height="9" fill="none" stroke="currentColor" stroke-width="1.2" />
        <path d="M40 26v42M40 26c-6-10-17-11-15-4 1 4 9 5 15 4zm0 0c6-10 17-11 15-4-1 4-9 5-15 4z" fill="none" stroke="currentColor" stroke-width="1.2" />
      </svg>
    }
    <ng-content />
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      overflow: hidden;
      background:
        radial-gradient(60% 45% at 50% 0%, rgb(255 244 218 / 0.9), transparent 70%),
        var(--color-ivory);
    }
    :host(.pi--arch) {
      border-radius: 999px 999px 0 0;
    }
    img {
      position: absolute;
      inset: var(--pi-inset, 18% 10% 10%);
      width: calc(100% - 2 * var(--pi-x, 10%));
      height: var(--pi-h, 72%);
      object-fit: var(--pi-fit, cover);
      mix-blend-mode: multiply;
      transition:
        transform 600ms var(--ease-premium),
        opacity 300ms ease,
        filter 300ms ease;
    }
    :host(.pi--plain) img {
      inset: 0;
      width: 100%;
      height: 100%;
    }
    :host(.pi--dim) img {
      filter: saturate(0.55);
      opacity: 0.8;
    }
    .pi-empty {
      position: absolute;
      inset: 0;
      margin: auto;
      width: 34%;
      height: 34%;
      color: var(--color-gold);
    }
    @media (prefers-reduced-motion: reduce) {
      img {
        transition: none;
      }
    }
  `,
})
export class ProductImage {
  readonly image = input<GiftImage | null>(null);
  readonly alt = input.required<string>();
  readonly sizes = input('(max-width: 767px) 80vw, 25vw');
  readonly shape = input<'arch' | 'plain'>('arch');
  readonly eager = input(false);
  readonly dim = input(false);
  readonly failed = signal(false);
  readonly srcset = computed(() => {
    const i = this.image();
    return i ? `${i.sm} 480w, ${i.md} 960w${i.lg !== i.md ? `, ${i.lg} 1600w` : ''}` : null;
  });
}
