import { Component, computed, input } from '@angular/core';
import { Category } from '@app/core/models/category';
import { Gift } from '@app/core/models/gift';
import { Reveal } from '../../motion/reveal';
import { GiftCard } from '../gift-card/gift-card';

/**
 * A row of shop windows. Heights alternate (short, tall, tall, short) and sit on a shared
 * baseline, so the grid reads as a street of windows rather than identical tiles.
 */
@Component({
  selector: 'app-gift-grid',
  imports: [GiftCard, Reveal],
  host: { class: 'block', '[class.gg-host--rail]': "layout() === 'rail'" },
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
  /**
   * 'grid' (default) or 'rail': on phones a rail becomes a horizontal, snap-scrolling row
   * (the next window peeks in from the edge). From 768px up both look the same.
   */
  readonly layout = input<'grid' | 'rail'>('grid');
  /**
   * When the windows make their entrance: 'mount' (default, a short rise as soon as they render)
   * or 'view' (only once the row is on screen, each window uncovered from the bottom up).
   */
  readonly reveal = input<'mount' | 'view'>('mount');

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
