import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { errorMessage } from '@app/core/api/error-message';
import { Gift } from '@app/core/models/gift';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { AdminGiftForm } from '../admin-gift-form/admin-gift-form';
import { AdminPageHead } from '../admin-page-head/admin-page-head';

/**
 * /admin/gifts/new and /admin/gifts/:id — your own wishes only. No reservation status here:
 * it is a surprise (and the database doesn't send it for your own gifts anyway).
 */
@Component({
  selector: 'app-gift-edit',
  imports: [RouterLink, AdminPageHead, AdminGiftForm, Modal],
  templateUrl: './gift-edit.html',
  styleUrl: './gift-edit.css',
})
export class GiftEdit {
  protected readonly catalogue = inject(Catalogue);
  private readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  readonly id = input<string | undefined>();

  protected readonly isNew = computed(() => !this.id());
  /** Only your own wishes can be edited (the database enforces it too). */
  protected readonly gift = computed(() => {
    const g = this.id() ? this.catalogue.gift(this.id()!) : null;
    return g && this.catalogue.isMine(g) ? g : null;
  });
  protected readonly deleteOpen = signal(false);
  protected readonly busy = signal(false);

  protected onSaved(g: Gift) {
    this.catalogue.upsert(g);
    this.toasts.success(this.isNew() ? 'Regalo añadido a tu lista.' : 'Cambios guardados.');
    if (this.isNew()) void this.router.navigate(['/admin/gifts', g.id], { replaceUrl: true });
  }

  protected async remove() {
    const g = this.gift();
    if (!g) return;
    this.busy.set(true);
    try {
      await this.api.deleteGift(g.id);
      this.deleteOpen.set(false);
      this.catalogue.remove(g.id);
      this.toasts.show('Regalo borrado.');
      void this.router.navigateByUrl('/admin/gifts');
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
