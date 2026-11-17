import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { Category } from '@app/core/models/category';
import { Gift, PRIORITY_LABEL, PRIORITY_RANK } from '@app/core/models/gift';
import { Session } from '@app/core/auth/session';
import { PriceLabel } from '../price-label/price-label';
import { ProductImage } from '../product-image/product-image';
import { ReservationBadge } from '../reservation-badge/reservation-badge';
import { ReserveButton } from '../reserve-button/reserve-button';

/**
 * One gift, told as a letter to the Three Kings: the photo taped on as a polaroid, the priority
 * as a wax seal, and a tear-off stub at the foot with what you can do (edit it, or reserve it).
 */
@Component({
  selector: 'app-gift-detail',
  imports: [RouterLink, ProductImage, PriceLabel, ReservationBadge, ReserveButton],
  host: { class: 'block' },
  templateUrl: './gift-detail.html',
  styleUrl: './gift-detail.css',
})
export class GiftDetail {
  private readonly session = inject(Session);
  private readonly catalogue = inject(Catalogue);

  readonly gift = input.required<Gift>();
  readonly category = input<Category | null>(null);

  protected readonly mine = computed(() => this.catalogue.mine().has(this.gift().id));
  /** Your own wish: no reserve button, no status (the database doesn't even send it). */
  protected readonly isMyWish = computed(() => this.catalogue.isMine(this.gift()));
  protected readonly listName = computed(() => {
    const l = this.catalogue.list(this.gift().forId);
    return l ? (l.id === this.catalogue.meId() ? 'Tu lista' : `Lista de ${l.name}`) : 'Wishlist';
  });
  /** The letter is signed by whoever wished for it. */
  protected readonly signature = computed(() => this.catalogue.list(this.gift().forId)?.name ?? '');
  protected readonly rank = computed(() => PRIORITY_RANK[this.gift().priority]);
  protected readonly priorityLabel = computed(() => PRIORITY_LABEL[this.gift().priority]);
}
