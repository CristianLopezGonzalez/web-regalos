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
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Session } from '@app/core/auth/session';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { GiftDetail } from '@app/design-system/gift/gift-detail/gift-detail';
import { PriceLabel } from '@app/design-system/gift/price-label/price-label';

/** What the mobile action bar offers; mirrors app-reserve-button's states. */
type BarState = 'available' | 'mine' | 'reserved' | null;

/** /wishlist/:id */
@Component({
  selector: 'app-gift-page',
  imports: [RouterLink, GiftDetail, PriceLabel],
  templateUrl: './gift-page.html',
  styleUrl: './gift-page.css',
})
export class GiftPage {
  protected readonly catalogue = inject(Catalogue);
  private readonly session = inject(Session);
  private readonly title = inject(Title);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly id = input.required<string>();

  protected readonly gift = computed(() => this.catalogue.gift(this.id()));

  protected readonly backLabel = computed(() => {
    const l = this.catalogue.list(this.gift()?.forId);
    return l
      ? `Volver a ${l.id === this.catalogue.meId() ? 'tu lista' : 'la lista de ' + l.name}`
      : 'Volver a la wishlist';
  });

  /**
   * Mobile action bar: the same states as app-reserve-button (nothing on your own wishes or
   * without a profile). Its buttons only forward the click to that component, so the confirm
   * modal, the toasts and the race handling stay in one place.
   */
  protected readonly barState = computed<BarState>(() => {
    const g = this.gift();
    if (!g || !this.session.profile() || this.catalogue.isMine(g)) return null;
    if (this.catalogue.mine().has(g.id)) return 'mine';
    return g.isReserved ? 'reserved' : 'available';
  });

  /** True while the original reserve control is still below the fold (or behind the bar). */
  protected readonly actionsBelow = signal(false);
  protected readonly barShown = computed(() => !!this.barState() && this.actionsBelow());

  private io?: IntersectionObserver;
  private observed: Element | null = null;

  constructor() {
    effect(() => {
      const g = this.gift();
      if (g) this.title.setTitle(`${g.name} · My Christmas Wishlist`);
    });

    // Watch the original control; re-attach whenever the detail renders a new one.
    afterRenderEffect(() => {
      this.gift();
      this.barState();
      this.watch(this.host.nativeElement.querySelector('app-gift-detail app-reserve-button'));
    });

    // Toasts sit above the bar while it is up (they would otherwise cover "Cancelar mi reserva").
    const root = this.host.nativeElement.ownerDocument.documentElement;
    afterRenderEffect(() => {
      const bar = this.barShown()
        ? this.host.nativeElement.querySelector<HTMLElement>('.gp-bar')
        : null;
      if (bar?.offsetHeight) root.style.setProperty('--bottom-bar', `${bar.offsetHeight}px`);
      else root.style.removeProperty('--bottom-bar');
    });

    inject(DestroyRef).onDestroy(() => {
      this.io?.disconnect();
      root.style.removeProperty('--bottom-bar');
    });
  }

  private watch(el: Element | null) {
    if (el === this.observed || typeof IntersectionObserver === 'undefined') return;
    this.io?.disconnect();
    this.observed = el;
    this.actionsBelow.set(false);
    if (!el) return;
    // The bottom margin is the bar's own height: it only leaves once the real button clears it.
    this.io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1]; // the latest state wins when several are batched
        this.actionsBelow.set(!e.isIntersecting && e.boundingClientRect.top > 0);
      },
      { rootMargin: '0px 0px -96px 0px' },
    );
    this.io.observe(el);
  }

  /** Same handler as the original control: click it (opens its confirm / cancel modal). */
  protected forward(action: 'reserve' | 'cancel') {
    const target = this.observed?.querySelector<HTMLButtonElement>(
      `[data-reserve-action="${action}"]`,
    );
    if (!target) return;
    // The dialog returns focus to the bar button, which a state change may have replaced:
    // when it closes, land on the bar's new control instead of <body>.
    const doc = this.host.nativeElement.ownerDocument;
    doc.addEventListener(
      'close',
      () =>
        setTimeout(() => {
          if (doc.activeElement && doc.activeElement !== doc.body) return;
          this.host.nativeElement
            .querySelector<HTMLElement>('.gp-bar.is-shown button:not(:disabled)')
            ?.focus();
        }),
      { capture: true, once: true },
    );
    target.click();
  }
}
