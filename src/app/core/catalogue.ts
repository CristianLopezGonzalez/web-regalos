import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Category, Gift, WishList } from './models';
import { WishlistApi } from './wishlist-api';

/**
 * In-memory view of the wishlists for the signed-in person: the lists (one per person with a
 * list of their own), gifts, categories, live reservation status and which reservations are theirs.
 * Your own gifts always arrive as "not reserved": the database hides that from you.
 */
@Injectable({ providedIn: 'root' })
export class Catalogue {
  private readonly api = inject(WishlistApi);

  readonly lists = signal<WishList[] | null>(null);
  readonly gifts = signal<Gift[] | null>(null);
  readonly categories = signal<Category[] | null>(null);
  /** Gift ids reserved by the current person (my_reservations RPC). */
  readonly mine = signal<ReadonlySet<string>>(new Set());
  readonly error = signal<unknown>(null);

  readonly loaded = computed(() => this.gifts() !== null && this.categories() !== null && this.lists() !== null);
  /** The signed-in person's id = the id of their own list, if they have one. */
  readonly meId = computed(() => this.api.profile()?.id ?? null);
  readonly myList = computed(() => this.lists()?.find((l) => l.id === this.meId()) ?? null);
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
    this.lists.set(null);
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
        const [lists, gifts, categories, mine] = await Promise.all([
          this.api.listWishLists(),
          this.api.listGifts(),
          this.api.listCategories(),
          this.api.myReservations(),
        ]);
        this.lists.set(lists);
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
  /** One of the signed-in person's own wishes (its reservation state is a surprise). */
  isMine(g: Gift) {
    return g.forId === this.meId();
  }
  list(id: string | null | undefined) {
    return id ? (this.lists()?.find((l) => l.id === id) ?? null) : null;
  }
  giftsFor(listId: string) {
    return (this.gifts() ?? []).filter((g) => g.forId === listId);
  }
  /** "Tu lista" for your own, "La lista de Angela" for the rest. */
  listTitle(l: WishList) {
    return l.id === this.meId() ? 'Tu lista' : `La lista de ${l.name}`;
  }
  category(id: string | null) {
    return id ? (this.categories()?.find((c) => c.id === id) ?? null) : null;
  }
  countIn(categoryId: string) {
    return (this.gifts() ?? []).filter((g) => g.categoryId === categoryId).length;
  }

  setStatus(giftId: string, isReserved: boolean) {
    // Belt and braces: the database never sends these for your own gifts.
    this.gifts.update((l) => l?.map((g) => (g.id === giftId && !this.isMine(g) ? { ...g, isReserved } : g)) ?? l);
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
