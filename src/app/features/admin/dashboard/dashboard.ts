import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { errorMessage } from '@app/core/api/error-message';
import { Gift } from '@app/core/models/gift';
import { Session } from '@app/core/auth/session';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { isHttpsUrl } from '@app/core/validation/https-url';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { PriceLabel } from '@app/design-system/gift/price-label/price-label';
import { ProductImage } from '@app/design-system/gift/product-image/product-image';
import { formToGiftInput, giftToForm } from '../admin-gift-form/gift-form-model';
import { AdminPageHead } from '../admin-page-head/admin-page-head';

/**
 * /admin: your list at a glance and the next useful actions. Never anything about the
 * reservations of your own list (the surprise). Gifts without a purchase link can get one right
 * here. The owner also gets the reserved gifts of the OTHER lists, to release stale ones.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, AdminPageHead, PriceLabel, ProductImage, Modal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly catalogue = inject(Catalogue);
  private readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);
  protected readonly session = inject(Session);

  protected readonly loaded = this.catalogue.loaded;
  /** Only YOUR gifts, and nothing about their reservations: that is the surprise. */
  private readonly myGifts = computed(() =>
    this.catalogue.meId() ? this.catalogue.giftsFor(this.catalogue.meId()!) : [],
  );
  protected readonly noLink = computed(() => this.myGifts().filter((g) => !g.purchaseUrl));
  protected readonly stats = computed(() => ({
    total: this.myGifts().length,
    favorites: this.myGifts().filter((g) => g.isFavorite).length,
    noLink: this.noLink().length,
  }));
  /** Owner only: reserved gifts of OTHER lists, so a stale reservation can be released after Christmas. */
  protected readonly reserved = computed(() =>
    (this.catalogue.gifts() ?? []).filter((g) => g.isReserved && !this.catalogue.isMine(g)),
  );
  protected readonly listName = (g: Gift) => this.catalogue.list(g.forId)?.name ?? '';
  /** What else is missing (the link has its own section above). */
  protected readonly otherTodo = computed(() =>
    this.myGifts()
      .flatMap((g) => [
        ...(!g.image ? [{ gift: g, reason: 'Sin foto' }] : []),
        ...(!g.categoryId ? [{ gift: g, reason: 'Sin categoría' }] : []),
      ])
      .slice(0, 6),
  );

  // ---- inline "add the purchase link" ----
  protected readonly drafts = signal<Record<string, string>>({});
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly saving = signal<string | null>(null);

  protected setDraft(id: string, value: string) {
    this.drafts.update((d) => ({ ...d, [id]: value }));
    if (this.errors()[id]) this.errors.update(({ [id]: _, ...rest }) => rest);
  }

  protected async saveLink(g: Gift) {
    if (this.saving()) return;
    const url = (this.drafts()[g.id] ?? '').trim();
    if (!isHttpsUrl(url)) {
      this.errors.update((e) => ({
        ...e,
        [g.id]: url ? 'Tiene que ser un enlace que empiece por https://' : 'Pega primero el enlace.',
      }));
      return;
    }
    this.saving.set(g.id);
    try {
      const updated = await this.api.updateGift(
        g.id,
        { ...formToGiftInput(giftToForm(g)), purchaseUrl: url },
        null,
      );
      this.catalogue.upsert(updated);
      this.drafts.update(({ [g.id]: _, ...rest }) => rest);
      this.toasts.success(`Enlace guardado en ${g.name}.`);
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.saving.set(null);
    }
  }

  // ---- owner: release a reservation on someone else's list ----
  protected readonly toRelease = signal<Gift | null>(null);
  protected readonly busy = signal(false);

  protected async release() {
    const g = this.toRelease();
    if (!g) return;
    this.busy.set(true);
    try {
      await this.api.releaseGift(g.id);
      this.catalogue.setStatus(g.id, false);
      this.toasts.success(`${g.name} vuelve a estar disponible.`);
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
      this.toRelease.set(null);
    }
  }
}
