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

/** /wishlist?categoria=&q=&orden=&ver= : every filter lives in the URL. */
@Component({
  selector: 'app-wishlist-page',
  imports: [CategoryFilter, GiftGrid, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap wl">
      <header class="wl-head">
        <h1>La wishlist</h1>
        <p class="wl-sub">
          @if (catalogue.loaded()) {
            {{ stats().total }} deseos · {{ stats().reserved }} ya reservados
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
          <div class="field">
            <label class="field-label" for="wl-show">Mostrar</label>
            <select id="wl-show" class="input" [value]="show()" (change)="setParam('ver', $any($event.target).value, 'todos')">
              <option value="todos">Todos</option>
              <option value="disponibles">Disponibles</option>
              <option value="reservados">Reservados</option>
            </select>
          </div>
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
            <p>No hay ningún deseo con estos filtros.</p>
            <a class="btn btn-outline btn-sm" routerLink="/wishlist">Quitar filtros</a>
          </div>
        </app-gift-grid>
      }
    </div>
  `,
  styles: `
    .wl {
      padding-block: clamp(56px, 8vw, 112px) clamp(96px, 12vw, 160px);
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
  readonly categoria = input<string | undefined>();
  readonly q = input<string | undefined>();
  readonly orden = input<string | undefined>();
  readonly ver = input<string | undefined>();

  readonly catalogue = inject(Catalogue);
  private readonly router = inject(Router);

  readonly query = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  readonly stats = this.catalogue.stats;
  readonly sort = computed<Sort>(() => (SORTS.includes(this.orden() as Sort) ? (this.orden() as Sort) : 'prioridad'));
  readonly show = computed<Show>(() => (SHOWS.includes(this.ver() as Show) ? (this.ver() as Show) : 'todos'));
  readonly activeCategory = computed(() => this.catalogue.categories()?.find((c) => c.slug === this.categoria()) ?? null);
  readonly activeSlug = computed(() => this.activeCategory()?.slug ?? null);
  readonly errorText = computed(() => errorMessage(this.catalogue.error()));

  readonly counts = computed(() => {
    const out: Record<string, number> = {};
    for (const g of this.catalogue.gifts() ?? []) if (g.categoryId) out[g.categoryId] = (out[g.categoryId] ?? 0) + 1;
    return out;
  });

  readonly visible = computed<Gift[] | null>(() => {
    const all = this.catalogue.gifts();
    if (!all || !this.catalogue.categories()) return null;
    const cat = this.activeCategory();
    const q = norm(this.query().trim());
    const show = this.show();
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
