import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { errorMessage } from '@app/core/api/error-message';
import { Gift } from '@app/core/models/gift';
import { CategoryFilter } from '@app/design-system/gift/category-filter/category-filter';
import { GiftGrid } from '@app/design-system/gift/gift-grid/gift-grid';
import { countByCategory, filterGifts, parseShow, parseSort } from '../gift-filters';

/**
 * /wishlist?para=&categoria=&q=&orden=&ver= : every filter lives in the URL.
 * One list at a time (para = whose list). Your own list never shows reservations: surprise.
 */
@Component({
  selector: 'app-wishlist-page',
  imports: [CategoryFilter, GiftGrid, RouterLink],
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
  readonly orden = input<string | undefined>();
  readonly ver = input<string | undefined>();

  protected readonly query = signal('');
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
  protected readonly stats = computed(() => {
    const g = this.listGifts();
    const reserved = g.filter((x) => x.isReserved).length;
    return { total: g.length, reserved, available: g.length - reserved };
  });
  protected readonly sort = computed(() => parseSort(this.orden()));
  protected readonly show = computed(() => parseShow(this.ver()));
  private readonly activeCategory = computed(
    () => this.catalogue.categories()?.find((c) => c.slug === this.categoria()) ?? null,
  );
  protected readonly activeSlug = computed(() => this.activeCategory()?.slug ?? null);
  protected readonly errorText = computed(() => errorMessage(this.catalogue.error()));

  protected readonly counts = computed(() => countByCategory(this.listGifts()));

  protected readonly visible = computed<Gift[] | null>(() =>
    this.catalogue.loaded()
      ? filterGifts(this.listGifts(), {
          categoryId: this.activeCategory()?.id ?? null,
          // Your own list never shows reservations: nothing to filter by.
          show: this.isMyList() ? 'todos' : this.show(),
          query: this.query(),
          sort: this.sort(),
        })
      : null,
  );

  constructor() {
    effect(() => this.query.set(this.q() ?? ''));
  }

  protected onSearch(value: string) {
    this.query.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.setParam('q', value.trim(), ''), 300);
  }

  protected setParam(key: 'q' | 'orden' | 'ver', value: string, fallback: string) {
    void this.router.navigate([], {
      queryParams: { [key]: value && value !== fallback ? value : null },
      queryParamsHandling: 'merge',
      replaceUrl: key === 'q',
    });
  }
}
