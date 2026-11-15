import { Component, computed, input, signal } from '@angular/core';
import { GiftImage } from '@app/core/models/gift';

/**
 * A product photo shown as if in a lit shop window: ivory ground, light from above,
 * `multiply` so white studio backgrounds melt into the ivory. Shape: arched window or plain.
 */
@Component({
  selector: 'app-product-image',
  host: { '[class]': '"pi pi--" + shape()', '[class.pi--dim]': 'dim()' },
  templateUrl: './product-image.html',
  styleUrl: './product-image.css',
})
export class ProductImage {
  readonly image = input<GiftImage | null>(null);
  readonly alt = input.required<string>();
  readonly sizes = input('(max-width: 767px) 80vw, 25vw');
  readonly shape = input<'arch' | 'plain'>('arch');
  readonly eager = input(false);
  readonly dim = input(false);

  protected readonly failed = signal(false);
  protected readonly srcset = computed(() => {
    const i = this.image();
    return i ? `${i.sm} 480w, ${i.md} 960w${i.lg !== i.md ? `, ${i.lg} 1600w` : ''}` : null;
  });
}
