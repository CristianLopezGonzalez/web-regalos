import { Component, computed, input } from '@angular/core';
import { formatPrice } from '@app/core/format/price-format';
import { Currency } from '@app/core/models/gift';

/** Price in Spanish format with tabular figures. `size` follows the type scale. */
@Component({
  selector: 'app-price',
  host: { class: 'tabular', '[class]': '"price price--" + size()' },
  templateUrl: './price-label.html',
  styleUrl: './price-label.css',
})
export class PriceLabel {
  readonly value = input.required<number>();
  readonly currency = input<Currency>('EUR');
  readonly size = input<'sm' | 'lg'>('sm');

  protected readonly label = computed(() => formatPrice(this.value(), this.currency()));
}
