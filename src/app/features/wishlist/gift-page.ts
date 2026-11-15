import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Catalogue } from '../../core/catalogue';
import { GiftDetail } from '../../design-system/gift/gift-detail';
import { GiftGrid } from '../../design-system/gift/gift-grid';

/** /wishlist/:id */
@Component({
  selector: 'app-gift-page',
  imports: [RouterLink, GiftDetail, GiftGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap gp">
      <a class="gp-back" routerLink="/wishlist" [queryParams]="{ para: gift()?.forId ?? null }">
        <span aria-hidden="true">←</span> {{ backLabel() }}
      </a>

      @if (!catalogue.loaded()) {
        <div class="gp-skel" aria-busy="true" aria-label="Cargando el regalo">
          <div class="gp-skel-window skeleton"></div>
          <div class="grid gap-5 content-start pt-10">
            <div class="skeleton h-14 w-4/5"></div>
            <div class="skeleton h-10 w-1/3"></div>
            <div class="skeleton h-24 w-full"></div>
            <div class="skeleton h-13 w-full"></div>
          </div>
        </div>
      } @else if (gift(); as g) {
        <app-gift-detail [gift]="g" [category]="catalogue.category(g.categoryId)" />

        @if (more().length) {
          <section class="gp-more" aria-labelledby="more-h">
            <h2 id="more-h">{{ moreTitle() }}</h2>
            <app-gift-grid [gifts]="more()" [categories]="catalogue.categories()" [mine]="catalogue.mine()" [eagerCount]="0" />
          </section>
        }
      } @else {
        <div class="gp-missing">
          <h1>Este deseo ya no está</h1>
          <p>Puede que lo hayan quitado de la lista o que el enlace esté incompleto.</p>
          <a class="btn btn-primary" routerLink="/wishlist">Ver la wishlist</a>
        </div>
      }
    </div>
  `,
  styles: `
    .gp {
      padding-block: 24px clamp(96px, 12vw, 160px);
    }
    .gp-back {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      margin-bottom: clamp(24px, 4vw, 40px);
      font: 500 12px/1 var(--font-sans);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      text-decoration: none;
      color: var(--color-ink-soft);
    }
    @media (hover: hover) and (pointer: fine) {
      .gp-back:hover {
        color: var(--color-cherry);
      }
    }
    .gp-skel {
      display: grid;
      gap: 48px;
    }
    .gp-skel-window {
      aspect-ratio: 4 / 5;
      border-radius: 999px 999px 0 0;
    }
    @media (min-width: 900px) {
      .gp-skel {
        grid-template-columns: 7fr 5fr;
        gap: clamp(48px, 7vw, 112px);
      }
    }
    .gp-more {
      margin-top: clamp(112px, 14vw, 200px);
      padding-top: clamp(56px, 7vw, 88px);
      border-top: 1px solid var(--color-line);
    }
    .gp-more h2 {
      margin: 0 0 clamp(40px, 6vw, 64px);
      font: 400 clamp(38px, 4vw, 52px) / 1 var(--font-display);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-burgundy);
      text-align: center;
    }
    .gp-missing {
      padding: 96px 0;
      text-align: center;
    }
    .gp-missing h1 {
      margin: 0;
      font: 400 clamp(36px, 5vw, 60px) / 1 var(--font-display);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .gp-missing p {
      margin: 20px auto 32px;
      max-width: 30rem;
      font: italic 400 18px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
  `,
})
export class GiftPage {
  readonly id = input.required<string>();
  readonly catalogue = inject(Catalogue);
  private readonly title = inject(Title);

  readonly gift = computed(() => this.catalogue.gift(this.id()));

  readonly backLabel = computed(() => {
    const l = this.catalogue.list(this.gift()?.forId);
    return l ? `Volver a ${l.id === this.catalogue.meId() ? 'tu lista' : 'la lista de ' + l.name}` : 'Volver a la wishlist';
  });

  /** Same list only: same department first, then anything still available. */
  readonly more = computed(() => {
    const g = this.gift();
    if (!g) return [];
    const all = this.catalogue.giftsFor(g.forId);
    const same = all.filter((x) => x.id !== g.id && x.categoryId === g.categoryId);
    const rest = all.filter((x) => x.id !== g.id && x.categoryId !== g.categoryId && !x.isReserved);
    return [...same, ...rest].slice(0, 4);
  });
  readonly moreTitle = computed(() => {
    const g = this.gift();
    const c = g && this.catalogue.category(g.categoryId);
    const allSame = this.more().every((x) => x.categoryId === g?.categoryId);
    return c && allSame ? `Más de ${c.name}` : 'Otros deseos';
  });

  constructor() {
    effect(() => {
      const g = this.gift();
      if (g) this.title.setTitle(`${g.name} · My Christmas Wishlist`);
    });
  }
}
