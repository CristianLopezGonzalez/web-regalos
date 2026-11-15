import { Component, computed, input } from '@angular/core';
import { Category } from '@app/core/models/category';
import { Gift } from '@app/core/models/gift';
import { GiftCard } from '../gift-card/gift-card';

/**
 * A row of shop windows. Heights alternate (short, tall, tall, short) and sit on a shared
 * baseline, so the grid reads as a street of windows rather than identical tiles.
 */
@Component({
  selector: 'app-gift-grid',
  imports: [GiftCard],
  host: { class: 'block' },
  templateUrl: './gift-grid.html',
  styleUrl: './gift-grid.css',
})
export class GiftGrid {
  /** null = loading */
  readonly gifts = input.required<Gift[] | null>();
  readonly categories = input<Category[] | null>(null);
  readonly mine = input<ReadonlySet<string>>(new Set());
  readonly eagerCount = input(2);
  readonly skeletonCount = input(8);

  protected readonly skeletons = computed(() =>
    Array.from({ length: this.skeletonCount() }, (_, i) => i),
  );
  protected isTall(i: number) {
    return i % 4 === 1 || i % 4 === 2;
  }
  protected nameOf(id: string | null) {
    return this.categories()?.find((c) => c.id === id)?.name ?? null;
  }
}
