import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Gift } from '../../core/models';
import { PriceLabel } from './price-label';
import { ProductImage } from './product-image';
import { ReservationBadge } from './reservation-badge';

/** One gift in its own arched shop window, lit from above. */
@Component({
  selector: 'app-gift-card',
  imports: [RouterLink, ProductImage, ReservationBadge, PriceLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article class="gc" [class.gc--tall]="tall()">
      <a class="gc-link" [routerLink]="['/wishlist', gift().id]">
        <app-product-image class="gc-window" [image]="gift().image" [alt]="gift().name" [dim]="gift().isReserved" [eager]="eager()">
          @if (gift().isReserved) {
            <app-reservation-badge class="gc-plaque" [reserved]="true" [mine]="mine()" />
          }
        </app-product-image>
        <h3 class="gc-name">{{ gift().name }}</h3>
        <p class="gc-meta">
          @if (categoryName()) {
            <span>{{ categoryName() }}</span><span class="diamond" aria-hidden="true"></span>
          }
          <app-price [value]="gift().price" [currency]="gift().currency" />
        </p>
      </a>
    </article>
  `,
  styles: `
    .gc-link {
      display: block;
      text-align: center;
      text-decoration: none;
      border-radius: 2px;
    }
    .gc-window {
      aspect-ratio: 3 / 4;
      outline: 1px solid var(--color-gold);
      outline-offset: 6px;
      transition: outline-offset 400ms var(--ease-premium);
    }
    .gc--tall .gc-window {
      aspect-ratio: 3 / 4.6;
    }
    .gc-plaque {
      position: absolute;
      left: 50%;
      bottom: 14px;
      translate: -50% 0;
    }
    .gc-name {
      margin: 26px 0 0;
      font: 400 clamp(16px, 1.25vw, 19px) / 1.3 var(--font-serif);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .gc-meta {
      display: inline-flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 6px 10px;
      margin: 10px 0 0;
      font-size: 15px;
      line-height: 1.2;
      color: var(--color-ink-soft);
    }
    @media (hover: hover) and (pointer: fine) {
      .gc-link:hover .gc-window {
        outline-offset: 10px;
      }
      .gc-link:hover ::ng-deep img {
        transform: scale(1.03);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .gc-window {
        transition: none;
      }
    }
  `,
})
export class GiftCard {
  readonly gift = input.required<Gift>();
  readonly categoryName = input<string | null>(null);
  readonly mine = input(false);
  readonly tall = input(false);
  readonly eager = input(false);
}
