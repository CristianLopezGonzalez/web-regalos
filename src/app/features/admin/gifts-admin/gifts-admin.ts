import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '@app/core/api/error-message';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { Gift, PRIORITY_LABEL } from '@app/core/models/gift';
import { Toasts } from '@app/core/toast/toasts';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { PriceLabel } from '@app/design-system/gift/price-label/price-label';
import { ProductImage } from '@app/design-system/gift/product-image/product-image';
import { AdminPageHead } from '../admin-page-head/admin-page-head';

/**
 * /admin/gifts: an inventory ledger of YOUR list, not a data grid. Rows stack into cards on phones.
 * No reservation column: what you have been given is a surprise. Each row can be deleted (with a
 * confirmation), so a mistaken or repeated wish is one click away from gone.
 */
@Component({
  selector: 'app-gifts-admin',
  imports: [RouterLink, AdminPageHead, PriceLabel, ProductImage, Modal],
  templateUrl: './gifts-admin.html',
  styleUrl: './gifts-admin.css',
})
export class GiftsAdmin {
  protected readonly catalogue = inject(Catalogue);
  private readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);

  protected readonly priority = PRIORITY_LABEL;
  protected readonly rows = computed(() =>
    [...(this.catalogue.meId() ? this.catalogue.giftsFor(this.catalogue.meId()!) : [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((gift) => ({ gift, category: this.catalogue.category(gift.categoryId)?.name ?? null })),
  );

  protected readonly toDelete = signal<Gift | null>(null);
  protected readonly busy = signal(false);

  protected async remove() {
    const g = this.toDelete();
    if (!g) return;
    this.busy.set(true);
    try {
      await this.api.deleteGift(g.id);
      this.catalogue.remove(g.id);
      this.toasts.show(`«${g.name}» borrado de tu lista.`);
      this.toDelete.set(null);
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
