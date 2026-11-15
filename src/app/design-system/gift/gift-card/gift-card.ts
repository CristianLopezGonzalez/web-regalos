import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Gift } from '@app/core/models/gift';
import { PriceLabel } from '../price-label/price-label';
import { ProductImage } from '../product-image/product-image';
import { ReservationBadge } from '../reservation-badge/reservation-badge';

/** One gift in its own arched shop window, lit from above. */
@Component({
  selector: 'app-gift-card',
  imports: [RouterLink, ProductImage, ReservationBadge, PriceLabel],
  host: { class: 'block' },
  templateUrl: './gift-card.html',
  styleUrl: './gift-card.css',
})
export class GiftCard {
  readonly gift = input.required<Gift>();
  readonly categoryName = input<string | null>(null);
  readonly mine = input(false);
  readonly tall = input(false);
  readonly eager = input(false);
}
