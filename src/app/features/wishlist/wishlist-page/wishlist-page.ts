import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { NavigationStart, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { errorMessage } from '@app/core/api/error-message';
import { Gift } from '@app/core/models/gift';
import { CategoryFilter } from '@app/design-system/gift/category-filter/category-filter';
import { GiftGrid } from '@app/design-system/gift/gift-grid/gift-grid';
import {
  countByCategory,
  filterGifts,
  hasActiveFilters,
  parseShow,
  parseSort,
  tabCategories,
} from '../gift-filters';

/**
 * /wishlist?para=&categoria=&q=&orden=&ver= : every filter lives in the URL.
 * One list at a time (para = whose list). Your own list never shows reservations: surprise.
 */
@Component({
  selector: 'app-wishlist-page',
  imports: [CategoryFilter, GiftGrid, NgTemplateOutlet, RouterLink],
  templateUrl: './wishlist-page.html',
  styleUrl: './wishlist-page.css',
})
export class WishlistPage {
  protected readonly catalogue = inject(Catalogue);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  /** Phones (< 768px): search + "Filtrar" button; the selects move into a bottom sheet. */
  private readonly mobileQuery =
    typeof matchMedia === 'function' ? matchMedia('(max-width: 767.98px)') : null;
  protected readonly compact = signal(this.mobileQuery?.matches ?? false);
  protected readonly sheetOpen = signal(false);
  private readonly sheet = viewChild<ElementRef<HTMLDialogElement>>('sheet');
  private readonly cats = viewChild<ElementRef<HTMLElement>>('cats');

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
  protected readonly tabCategories = computed(() =>
    tabCategories(this.catalogue.categories() ?? [], this.counts(), this.activeSlug()),
  );
  /** Drives the dot on "Filtrar": something other than the defaults is applied. */
  protected readonly filtersActive = computed(() =>
    hasActiveFilters({ show: this.isMyList() ? 'todos' : this.show(), sort: this.sort() }),
  );

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

    const onBreakpoint = (e: MediaQueryListEvent) => {
      if (!e.matches) this.closeSheet(true);
      this.compact.set(e.matches);
    };
    this.mobileQuery?.addEventListener('change', onBreakpoint);

    // Back/forward while the sheet is open: the sheet goes away with the page state it belonged to.
    this.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e instanceof NavigationStart && e.navigationTrigger === 'popstate') this.closeSheet(true);
    });
    inject(DestroyRef).onDestroy(() => {
      this.mobileQuery?.removeEventListener('change', onBreakpoint);
      this.lockScroll(false);
      clearTimeout(this.searchTimer);
    });

    // Fade the tab strip's edges only where there is more to scroll to.
    afterRenderEffect((onCleanup) => {
      this.tabCategories();
      const host = this.cats()?.nativeElement;
      const nav = host?.querySelector<HTMLElement>('.cf');
      if (!host || !nav) return;
      const update = () => {
        const max = nav.scrollWidth - nav.clientWidth;
        host.classList.toggle('fade-l', nav.scrollLeft > 2);
        host.classList.toggle('fade-r', nav.scrollLeft < max - 2);
      };
      update();
      nav.addEventListener('scroll', update, { passive: true });
      const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
      ro?.observe(nav);
      onCleanup(() => {
        nav.removeEventListener('scroll', update);
        ro?.disconnect();
      });
    });
  }

  protected openSheet() {
    const dialog = this.sheet()?.nativeElement;
    if (!dialog || dialog.open) return;
    dialog.classList.remove('closing');
    dialog.showModal();
    this.sheetOpen.set(true);
    this.lockScroll(true);
    dialog.querySelector<HTMLElement>('select')?.focus();
  }

  /** Slides the sheet out, then closes it (immediately with reduced motion or `now`). */
  protected closeSheet(now = false) {
    const dialog = this.sheet()?.nativeElement;
    if (!dialog?.open) return;
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (now || reduced) return this.finishClose(dialog);
    dialog.classList.add('closing');
  }

  protected onSheetAnimationEnd(e: AnimationEvent) {
    const dialog = e.currentTarget as HTMLDialogElement;
    if (e.target === dialog && dialog.classList.contains('closing')) this.finishClose(dialog);
  }

  /** The dialog itself only receives clicks on its backdrop (content sits in .wl-sheet-body). */
  protected onSheetClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this.closeSheet();
  }

  private finishClose(dialog: HTMLDialogElement) {
    dialog.classList.remove('closing');
    dialog.close();
    // The (close) event fires a task later: if the breakpoint change removes the dialog first,
    // its listener never runs and <html> would stay locked. Release everything now instead.
    this.onSheetClosed();
  }

  /** Runs however the dialog closed (button, backdrop, Esc, or the browser forcing it). */
  protected onSheetClosed() {
    this.sheet()?.nativeElement.classList.remove('closing');
    this.sheetOpen.set(false);
    this.lockScroll(false);
  }

  private lockScroll(on: boolean) {
    // Inline style: component CSS can't reach <html>. Phones only, so no scrollbar jump.
    this.document.documentElement.style.overflow = on ? 'hidden' : '';
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
