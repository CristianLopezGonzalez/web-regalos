import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { errorMessage } from '@app/core/api/error-message';
import { Gift } from '@app/core/models/gift';
import { Session } from '@app/core/auth/session';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { PriceLabel } from '@app/design-system/gift/price-label/price-label';
import { AdminPageHead } from '../admin-page-head/admin-page-head';

/**
 * /admin: your list at a glance and the next useful actions. Never anything about the
 * reservations of your own list (the surprise). The owner also gets the reserved gifts of the
 * OTHER lists, to release stale ones.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, AdminPageHead, PriceLabel, Modal],
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
  protected readonly stats = computed(() => ({
    total: this.myGifts().length,
    favorites: this.myGifts().filter((g) => g.isFavorite).length,
    todo: this.todoAll().length,
  }));
  /** Owner only: reserved gifts of OTHER lists, so a stale reservation can be released after Christmas. */
  protected readonly reserved = computed(() =>
    (this.catalogue.gifts() ?? []).filter((g) => g.isReserved && !this.catalogue.isMine(g)),
  );
  protected readonly listName = (g: Gift) => this.catalogue.list(g.forId)?.name ?? '';
  private readonly todoAll = computed(() =>
    this.myGifts().flatMap((g) => [
      ...(!g.image ? [{ gift: g, reason: 'Sin foto' }] : []),
      ...(!g.purchaseUrl ? [{ gift: g, reason: 'Sin enlace de compra' }] : []),
      ...(!g.categoryId ? [{ gift: g, reason: 'Sin categoría' }] : []),
    ]),
  );
  protected readonly todo = computed(() => this.todoAll().slice(0, 6));
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
