import { Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { errorMessage } from '@app/core/api/error-message';
import { Gift, Priority } from '@app/core/models/gift';
import { WishList } from '@app/core/models/wish-list';
import { GiftShelf } from '@app/design-system/gift/gift-shelf/gift-shelf';
import { countByCategory, filterGifts, parseShow, tabCategories } from '../gift-filters';

/** Shelf headings, most wanted first. Your own list speaks to you; someone else's, about them. */
const SHELVES: { priority: Priority; theirs: string; yours: string }[] = [
  { priority: 'high', theirs: 'Lo que más desea', yours: 'Lo que más deseas' },
  { priority: 'medium', theirs: 'Le haría mucha ilusión', yours: 'Te haría mucha ilusión' },
  { priority: 'low', theirs: 'Si te apetece', yours: 'Si les apetece' },
];

/**
 * /wishlist?para=&categoria=&q=&ver= : every filter lives in the URL.
 * One list at a time (para = whose list), shown as shelves by priority.
 * Your own list never shows reservations: surprise.
 */
@Component({
  selector: 'app-wishlist-page',
  imports: [GiftShelf, RouterLink],
  templateUrl: './wishlist-page.html',
  styleUrl: './wishlist-page.css',
})
export class WishlistPage {
  protected readonly catalogue = inject(Catalogue);
  private readonly router = inject(Router);

  // query params (component input binding)
  readonly para = input<string | undefined>();
  readonly categoria = input<string | undefined>();
  readonly q = input<string | undefined>();
  readonly ver = input<string | undefined>();

  protected readonly query = signal('');
  /** Phones: the search field opens from the "Buscar" button (always open on wider screens). */
  protected readonly searchOpen = signal(false);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  /** The list on screen: ?para=, else the first one that isn't yours (what you can gift), else yours. */
  protected readonly activeList = computed(() => {
    const lists = this.catalogue.lists() ?? [];
    return (
      lists.find((l) => l.id === this.para()) ??
      lists.find((l) => l.id !== this.catalogue.meId()) ??
      lists[0] ??
      null
    );
  });
  protected readonly isMyList = computed(
    () => !!this.activeList() && this.activeList()!.id === this.catalogue.meId(),
  );
  protected readonly listGifts = computed(() => {
    const l = this.activeList();
    return l ? this.catalogue.giftsFor(l.id) : [];
  });

  protected readonly freeCount = computed(() => this.listGifts().filter((g) => !g.isReserved).length);

  /** One card per list: how many wishes and, for other people's lists, how many are still free. */
  protected readonly people = computed(() =>
    (this.catalogue.lists() ?? []).map((l: WishList) => {
      const gifts = this.catalogue.giftsFor(l.id);
      const mine = l.id === this.catalogue.meId();
      const free = gifts.filter((g) => !g.isReserved).length;
      return {
        list: l,
        mine,
        initial: l.name.trim().charAt(0).toUpperCase(),
        total: gifts.length,
        free,
        /** Share already covered (0–100). Never computed for your own list. */
        covered: mine || !gifts.length ? 0 : Math.round(((gifts.length - free) / gifts.length) * 100),
      };
    }),
  );

  protected readonly onlyFree = computed(
    () => !this.isMyList() && parseShow(this.ver()) === 'disponibles',
  );
  private readonly activeCategory = computed(
    () => this.catalogue.categories()?.find((c) => c.slug === this.categoria()) ?? null,
  );
  protected readonly activeSlug = computed(() => this.activeCategory()?.slug ?? null);
  protected readonly errorText = computed(() => errorMessage(this.catalogue.error()));

  private readonly counts = computed(() => countByCategory(this.listGifts()));
  protected readonly tabCategories = computed(() =>
    tabCategories(this.catalogue.categories() ?? [], this.counts(), this.activeSlug()),
  );

  protected readonly visible = computed<Gift[] | null>(() =>
    this.catalogue.loaded()
      ? filterGifts(this.listGifts(), {
          categoryId: this.activeCategory()?.id ?? null,
          show: this.onlyFree() ? 'disponibles' : 'todos',
          query: this.query(),
          sort: 'prioridad',
        })
      : null,
  );

  /** The visible gifts, split into shelves by priority (empty shelves are left out). */
  protected readonly shelves = computed(() => {
    const gifts = this.visible() ?? [];
    const mine = this.isMyList();
    let seen = 0;
    return SHELVES.map((s) => {
      const items = gifts.filter((g) => g.priority === s.priority);
      const eager = Math.max(0, 4 - seen);
      seen += items.length;
      return { key: s.priority, heading: mine ? s.yours : s.theirs, gifts: items, eager };
    }).filter((s) => s.gifts.length);
  });

  protected readonly filtered = computed(
    () => !!this.activeCategory() || this.onlyFree() || !!this.query().trim(),
  );

  constructor() {
    effect(() => {
      const q = this.q() ?? '';
      this.query.set(q);
      if (q) this.searchOpen.set(true);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected toggleSearch() {
    const open = !this.searchOpen();
    this.searchOpen.set(open);
    if (open) setTimeout(() => this.searchInput()?.nativeElement.focus());
    else if (this.query()) this.onSearch('');
  }

  protected onSearch(value: string) {
    this.query.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.setParam('q', value.trim()), 300);
  }

  protected toggleFree() {
    this.setParam('ver', this.onlyFree() ? '' : 'disponibles');
  }

  private setParam(key: 'q' | 'ver', value: string) {
    void this.router.navigate([], {
      queryParams: { [key]: value || null },
      queryParamsHandling: 'merge',
      replaceUrl: key === 'q',
    });
  }
}
