import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatPrice } from '../../core/format';
import { Currency } from '../../core/models';

/** Price in Spanish format with tabular figures. `size` follows the type scale. */
@Component({
  selector: 'app-price',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tabular', '[class]': '"price price--" + size()' },
  template: `{{ label() }}`,
  styles: `
    :host {
      font-family: var(--font-sans);
      font-variant-numeric: tabular-nums lining-nums;
      white-space: nowrap;
    }
    :host(.price--sm) {
      font-size: 15px;
      color: var(--color-ink-soft);
    }
    :host(.price--lg) {
      font-family: var(--font-serif);
      font-size: clamp(26px, 2.6vw, 34px);
      letter-spacing: 0.01em;
      color: var(--color-chocolate);
    }
  `,
})
export class PriceLabel {
  readonly value = input.required<number>();
  readonly currency = input<Currency>('EUR');
  readonly size = input<'sm' | 'lg'>('sm');
  readonly label = computed(() => formatPrice(this.value(), this.currency()));
}
