import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Catalogue } from '../../core/catalogue';
import { errorMessage } from '../../core/format';
import { Gift, PRIORITY_RANK } from '../../core/models';
import { CategoryFilter } from '../../design-system/gift/category-filter';
import { GiftGrid } from '../../design-system/gift/gift-grid';

type Sort = 'prioridad' | 'precio-asc' | 'precio-desc' | 'recientes';
type Show = 'todos' | 'disponibles' | 'reservados';
const SORTS: Sort[] = ['prioridad', 'precio-asc', 'precio-desc', 'recientes'];
const SHOWS: Show[] = ['todos', 'disponibles', 'reservados'];

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * /wishlist?para=&categoria=&q=&orden=&ver= : every filter lives in the URL.
 * One list at a time (para = whose list). Your own list never shows reservations: surprise.
 */
@Component({
  selector: 'app-wishlist-page',
  imports: [CategoryFilter, GiftGrid, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap wl">
      @if ((catalogue.lists()?.length ?? 0) > 1) {
        <nav class="wl-lists" aria-label="Listas de deseos">
          @for (l of catalogue.lists(); track l.id) {
            <a
              class="wl-list"
              [class.on]="l.id === activeList()?.id"
              [routerLink]="[]"
              [queryParams]="{ para: l.id, ver: null, categoria: null }"
              queryParamsHandling="merge"
              [attr.aria-current]="l.id === activeList()?.id ? 'page' : null"
            >
              <span class="wl-list-name">{{ l.name }}</span>
              @if (l.id === catalogue.meId()) {
                <span class="wl-list-you">tú</span>
              }
              <span class="wl-list-count tabular"><span class="sr-only">, </span>{{ catalogue.giftsFor(l.id).length }}<span class="sr-only"> deseos</span></span>
            </a>
          }
        </nav>
      }
      <header class="wl-head">
        <h1>{{ activeList() ? catalogue.listTitle(activeList()!) : 'La wishlist' }}</h1>
        <p class="wl-sub">
          @if (catalogue.loaded()) {
            @if (isMyList()) {
              {{ stats().total }} deseos · lo que te han reservado es sorpresa
            } @else {
              {{ stats().total }} deseos · {{ stats().reserved }} ya reservados
            }
          } @else {
            Encendiendo los escaparates…
          }
        </p>
      </header>

      @if (catalogue.error()) {
        <div class="wl-error" role="alert">
          <p>{{ errorText() }}</p>
          <button type="button" class="btn btn-outline btn-sm" (click)="catalogue.load(true)">Reintentar</button>
        </div>
      } @else {
        @if (catalogue.categories(); as cats) {
          <app-category-filter [categories]="cats" [counts]="counts()" [total]="stats().total" [active]="activeSlug()" />
        } @else {
          <div class="wl-filter-skel skeleton" aria-hidden="true"></div>
        }

        <div class="wl-tools" role="search">
          <div class="field wl-search">
            <label class="field-label" for="wl-q">Buscar</label>
            <input id="wl-q" class="input" type="search" placeholder="Perfume, pluma, bufanda…" autocomplete="off" [value]="query()" (input)="onSearch($any($event.target).value)" />
          </div>
          @if (!isMyList()) {
          <div class="field">
            <label class="field-label" for="wl-show">Mostrar</label>
            <select id="wl-show" class="input" [value]="show()" (change)="setParam('ver', $any($event.target).value, 'todos')">
              <option value="todos">Todos</option>
              <option value="disponibles">Disponibles</option>
              <option value="reservados">Reservados</option>
            </select>
          </div>
          }
          <div class="field">
            <label class="field-label" for="wl-sort">Ordenar por</label>
            <select id="wl-sort" class="input" [value]="sort()" (change)="setParam('orden', $any($event.target).value, 'prioridad')">
              <option value="prioridad">Más deseados</option>
              <option value="precio-asc">Precio: de menor a mayor</option>
              <option value="precio-desc">Precio: de mayor a menor</option>
              <option value="recientes">Añadidos recientemente</option>
            </select>
          </div>
        </div>

        <p class="sr-only" aria-live="polite">{{ catalogue.loaded() ? visible()!.length + ' regalos' : '' }}</p>

        <app-gift-grid class="wl-grid" [gifts]="visible()" [categories]="catalogue.categories()" [mine]="catalogue.mine()" [eagerCount]="4">
          <div empty class="wl-empty">
            @if (listGifts().length) {
              <p>No hay ningún deseo con estos filtros.</p>
              <a class="btn btn-outline btn-sm" routerLink="/wishlist" [queryParams]="{ para: activeList()?.id }">Quitar filtros</a>
            } @else if (isMyList()) {
              <p>Tu lista todavía está vacía.</p>
              <a class="btn btn-primary btn-sm" routerLink="/admin/gifts/new">Añadir mi primer deseo</a>
            } @else {
              <p>{{ activeList()?.name }} todavía no ha añadido ningún deseo.</p>
            }
          </div>
        </app-gift-grid>
      }
    </div>
  `,
  styles: `
    .wl {
      padding-block: clamp(56px, 8vw, 112px) clamp(96px, 12vw, 160px);
    }
    .wl-lists {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: clamp(28px, 4vw, 44px);
    }
    .wl-list {
      display: inline-flex;
      align-items: baseline;
      gap: 12px;
      min-height: 52px;
      padding: 14px 22px;
      border: 1px solid var(--color-gold);
      color: var(--color-burgundy);
      text-decoration: none;
      transition:
        background-color 200ms ease,
        color 200ms ease;
    }
    .wl-list-name {
      font: 400 clamp(20px, 2.4vw, 26px) / 1 var(--font-display);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .wl-list-you {
      font: italic 400 15px/1 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .wl-list-count {
      font: 500 13px/1 var(--font-sans);
      letter-spacing: 0.1em;
      color: var(--color-ink-soft);
    }
    .wl-list.on {
      background: var(--color-burgundy);
      border-color: var(--color-burgundy);
      color: var(--color-ivory);
    }
    .wl-list.on .wl-list-you,
    .wl-list.on .wl-list-count {
      color: var(--color-brass);
    }
    @media (hover: hover) and (pointer: fine) {
      .wl-list:not(.on):hover {
        background: var(--color-cream-deep);
      }
    }
    .wl-head {
      margin-bottom: clamp(32px, 5vw, 56px);
      text-align: center;
    }
    h1 {
      margin: 0;
      font: 400 clamp(48px, 8vw, 112px) / 0.95 var(--font-display);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .wl-sub {
      margin: 18px 0 0;
      font: italic 400 18px/1.4 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .wl-filter-skel {
      height: 53px;
    }
    .wl-tools {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 12px;
      margin: 28px 0 clamp(56px, 7vw, 88px);
    }
    .wl-search {
      grid-column: 1 / -1;
    }
    @media (min-width: 720px) {
      .wl-tools {
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.3fr);
        align-items: end;
      }
      .wl-search {
        grid-column: auto;
      }
    }
    .wl-empty p,
    .wl-error p {
      margin: 0 0 20px;
      font: italic 400 20px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .wl-error {
      padding: 64px 0;
      text-align: center;
    }
  `,
})
export class WishlistPage {
  // query params (component input binding)
  readonly para = input<string | undefined>();
  readonly categoria = input<string | undefined>();
  readonly q = input<string | undefined>();
  readonly orden = input<string | undefined>();
  readonly ver = input<string | undefined>();

  readonly catalogue = inject(Catalogue);
  private readonly router = inject(Router);

  readonly query = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  /** The list on screen: ?para=, else the first one that isn't yours (what you can gift), else yours. */
  readonly activeList = computed(() => {
    const lists = this.catalogue.lists() ?? [];
    return lists.find((l) => l.id === this.para()) ?? lists.find((l) => l.id !== this.catalogue.meId()) ?? lists[0] ?? null;
  });
  readonly isMyList = computed(() => !!this.activeList() && this.activeList()!.id === this.catalogue.meId());
  readonly listGifts = computed(() => {
    const l = this.activeList();
    return l ? this.catalogue.giftsFor(l.id) : [];
  });
  readonly stats = computed(() => {
    const g = this.listGifts();
    const reserved = g.filter((x) => x.isReserved).length;
    return { total: g.length, reserved, available: g.length - reserved };
  });
  readonly sort = computed<Sort>(() => (SORTS.includes(this.orden() as Sort) ? (this.orden() as Sort) : 'prioridad'));
  readonly show = computed<Show>(() => (SHOWS.includes(this.ver() as Show) ? (this.ver() as Show) : 'todos'));
  readonly activeCategory = computed(() => this.catalogue.categories()?.find((c) => c.slug === this.categoria()) ?? null);
  readonly activeSlug = computed(() => this.activeCategory()?.slug ?? null);
  readonly errorText = computed(() => errorMessage(this.catalogue.error()));

  readonly counts = computed(() => {
    const out: Record<string, number> = {};
    for (const g of this.listGifts()) if (g.categoryId) out[g.categoryId] = (out[g.categoryId] ?? 0) + 1;
    return out;
  });

  readonly visible = computed<Gift[] | null>(() => {
    if (!this.catalogue.loaded()) return null;
    const all = this.listGifts();
    const cat = this.activeCategory();
    const q = norm(this.query().trim());
    const show = this.isMyList() ? 'todos' : this.show();
    const list = all.filter(
      (g) =>
        (!cat || g.categoryId === cat.id) &&
        (show === 'todos' || (show === 'reservados') === g.isReserved) &&
        (!q || norm(`${g.name} ${g.description}`).includes(q)),
    );
    const by: Record<Sort, (a: Gift, b: Gift) => number> = {
      prioridad: (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || Number(b.isFavorite) - Number(a.isFavorite),
      'precio-asc': (a, b) => a.price - b.price,
      'precio-desc': (a, b) => b.price - a.price,
      recientes: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return list.sort(by[this.sort()]);
  });

  constructor() {
    effect(() => this.query.set(this.q() ?? ''));
  }

  onSearch(value: string) {
    this.query.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.setParam('q', value.trim(), ''), 300);
  }

  setParam(key: 'q' | 'orden' | 'ver', value: string, fallback: string) {
    void this.router.navigate([], {
      queryParams: { [key]: value && value !== fallback ? value : null },
      queryParamsHandling: 'merge',
      replaceUrl: key === 'q',
    });
  }
}
