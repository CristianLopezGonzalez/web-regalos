import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Category, Gift } from '../../core/models';
import { GiftCard } from './gift-card';

/**
 * A row of shop windows. Heights alternate (short, tall, tall, short) and sit on a shared
 * baseline, so the grid reads as a street of windows rather than identical tiles.
 */
@Component({
  selector: 'app-gift-grid',
  imports: [GiftCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (gifts() === null) {
      <div class="gg" aria-busy="true" aria-label="Cargando regalos">
        @for (i of skeletons(); track i) {
          <div class="gg-skel" [class.gg-skel--tall]="isTall(i)" aria-hidden="true">
            <div class="gg-skel-window skeleton"></div>
            <div class="gg-skel-line skeleton"></div>
            <div class="gg-skel-line gg-skel-line--short skeleton"></div>
          </div>
        }
      </div>
    } @else if (gifts()!.length === 0) {
      <div class="gg-empty">
        <ng-content select="[empty]" />
      </div>
    } @else {
      <ul class="gg" role="list">
        @for (g of gifts(); track g.id; let i = $index) {
          <li animate.enter="gg-in" [style.--i]="i">
            <app-gift-card [gift]="g" [categoryName]="nameOf(g.categoryId)" [mine]="mine().has(g.id)" [tall]="isTall(i)" [eager]="i < eagerCount()" />
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .gg {
      display: grid;
      gap: 64px 24px;
      max-width: 340px;
      margin: 0 auto;
      padding: 0;
      list-style: none;
    }
    @media (min-width: 640px) {
      .gg {
        grid-template-columns: repeat(2, 1fr);
        max-width: none;
        align-items: end;
      }
    }
    @media (min-width: 1100px) {
      .gg {
        grid-template-columns: repeat(4, 1fr);
        gap: 80px 40px;
      }
    }
    .gg-skel-window {
      aspect-ratio: 3 / 4;
      border-radius: 999px 999px 0 0;
    }
    .gg-skel--tall .gg-skel-window {
      aspect-ratio: 3 / 4.6;
    }
    .gg-skel-line {
      height: 18px;
      width: 70%;
      margin: 28px auto 0;
    }
    .gg-skel-line--short {
      width: 36%;
      margin-top: 12px;
    }
    .gg-empty {
      padding: 64px 0;
      text-align: center;
    }
    .gg-in {
      animation: gg-in 420ms var(--ease-premium) both;
      animation-delay: calc(min(var(--i), 6) * 40ms);
    }
    @keyframes gg-in {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .gg-in {
        animation: none;
      }
    }
  `,
})
export class GiftGrid {
  /** null = loading */
  readonly gifts = input.required<Gift[] | null>();
  readonly categories = input<Category[] | null>(null);
  readonly mine = input<ReadonlySet<string>>(new Set());
  readonly eagerCount = input(2);
  readonly skeletonCount = input(8);
  readonly skeletons = computed(() => Array.from({ length: this.skeletonCount() }, (_, i) => i));
  isTall(i: number) {
    return i % 4 === 1 || i % 4 === 2;
  }
  nameOf(id: string | null) {
    return this.categories()?.find((c) => c.id === id)?.name ?? null;
  }
}
