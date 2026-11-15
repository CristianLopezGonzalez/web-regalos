import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Category, Gift } from './models';
import { WishlistApi } from './wishlist-api';

/**
 * In-memory view of the wishlist for the signed-in person: gifts, categories, live
 * reservation status and (family only) which reservations are theirs.
 */
@Injectable({ providedIn: 'root' })
export class Catalogue {
  private readonly api = inject(WishlistApi);

  readonly gifts = signal<Gift[] | null>(null);
  readonly categories = signal<Category[] | null>(null);
  /** Gift ids reserved by the current family member (my_reservations RPC). */
  readonly mine = signal<ReadonlySet<string>>(new Set());
  readonly error = signal<unknown>(null);

  readonly loaded = computed(() => this.gifts() !== null && this.categories() !== null);
  readonly favorites = computed(() => (this.gifts() ?? []).filter((g) => g.isFavorite));
  readonly stats = computed(() => {
    const g = this.gifts() ?? [];
    const reserved = g.filter((x) => x.isReserved).length;
    return { total: g.length, reserved, available: g.length - reserved };
  });

  private loading: Promise<void> | null = null;
  private unwatch: (() => void) | null = null;

  constructor() {
    // Reload whenever the signed-in person changes; drop everything on sign-out.
    effect(() => {
      const p = this.api.profile();
      untracked(() => {
        this.reset();
        if (p) void this.load();
      });
    });
  }

  private reset() {
    this.unwatch?.();
    this.unwatch = null;
    this.loading = null;
    this.gifts.set(null);
    this.categories.set(null);
    this.mine.set(new Set());
    this.error.set(null);
  }

  load(force = false): Promise<void> {
    if (this.loading && !force) return this.loading;
    this.error.set(null);
    this.loading = (async () => {
      try {
        const isFamily = this.api.profile()?.role === 'family';
        const [gifts, categories, mine] = await Promise.all([
          this.api.listGifts(),
          this.api.listCategories(),
          isFamily ? this.api.myReservations() : Promise.resolve([]),
        ]);
        this.gifts.set(gifts);
        this.categories.set(categories);
        this.mine.set(new Set(mine));
        if (!this.unwatch) this.unwatch = this.api.watchStatus((id, r) => this.setStatus(id, r));
      } catch (e) {
        this.error.set(e);
        this.loading = null;
      }
    })();
    return this.loading;
  }

  gift(id: string) {
    return this.gifts()?.find((g) => g.id === id) ?? null;
  }
  category(id: string | null) {
    return id ? (this.categories()?.find((c) => c.id === id) ?? null) : null;
  }
  countIn(categoryId: string) {
    return (this.gifts() ?? []).filter((g) => g.categoryId === categoryId).length;
  }

  setStatus(giftId: string, isReserved: boolean) {
    this.gifts.update((l) => l?.map((g) => (g.id === giftId ? { ...g, isReserved } : g)) ?? l);
  }

  async reserve(giftId: string) {
    try {
      await this.api.reserve(giftId);
      this.setStatus(giftId, true);
      this.mine.update((s) => new Set(s).add(giftId));
    } catch (e) {
      // Whatever happened, re-sync this gift's status from the server.
      const fresh = await this.api.getGift(giftId).catch(() => null);
      if (fresh) this.setStatus(giftId, fresh.isReserved);
      throw e;
    }
  }

  async cancel(giftId: string) {
    await this.api.cancelReservation(giftId);
    this.setStatus(giftId, false);
    this.mine.update((s) => {
      const n = new Set(s);
      n.delete(giftId);
      return n;
    });
  }

  upsert(g: Gift) {
    this.gifts.update((l) => (l ? (l.some((x) => x.id === g.id) ? l.map((x) => (x.id === g.id ? g : x)) : [...l, g]) : l));
  }
  remove(id: string) {
    this.gifts.update((l) => l?.filter((g) => g.id !== id) ?? l);
  }
}
