import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Gift } from '@app/core/models/gift';
import { PriceLabel } from '../price-label/price-label';
import { ProductImage } from '../product-image/product-image';

/**
 * One shelf of the wishlist: a heading and its gifts, each an arched window standing on a gold
 * shelf. From 768px a grid; on phones a horizontal row you swipe (the next window peeks in).
 * Nothing sits on top of the photo: price, or the reserved state, goes underneath.
 */
@Component({
  selector: 'app-gift-shelf',
  imports: [RouterLink, ProductImage, PriceLabel],
  host: { class: 'block' },
  templateUrl: './gift-shelf.html',
  styleUrl: './gift-shelf.css',
})
export class GiftShelf {
  readonly heading = input.required<string>();
  readonly gifts = input.required<Gift[]>();
  /** Ids you reserved yourself ("Lo has reservado tú"). */
  readonly mine = input<ReadonlySet<string>>(new Set());
  /** How many photos load eagerly (the first shelf on screen). */
  readonly eagerCount = input(0);
}
