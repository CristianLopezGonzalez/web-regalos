import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalogue } from '../../core/catalogue';
import { Category, Gift, PRIORITY_LABEL, PRIORITY_RANK } from '../../core/models';
import { Session } from '../../core/session';
import { PriceLabel } from './price-label';
import { ProductImage } from './product-image';
import { ReservationBadge } from './reservation-badge';
import { ReserveButton } from './reserve-button';

/** One gift, staged: a large arched window on the left, the label card on the right. */
@Component({
  selector: 'app-gift-detail',
  imports: [RouterLink, ProductImage, PriceLabel, ReservationBadge, ReserveButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article class="gd">
      <div class="gd-stage">
        <app-product-image
          class="gd-window"
          [image]="gift().image"
          [alt]="gift().name"
          [eager]="true"
          sizes="(max-width: 899px) 92vw, 46vw"
          [dim]="gift().isReserved"
        >
          @if (gift().isReserved) {
            <app-reservation-badge class="gd-plaque" [reserved]="true" [mine]="mine()" />
          }
        </app-product-image>
      </div>

      <div class="gd-card">
        <p class="gd-crumbs caps">
          <a routerLink="/wishlist" [queryParams]="{ para: gift().forId }">{{ listName() }}</a>
          @if (category()) {
            <span class="diamond" aria-hidden="true"></span>
            <a routerLink="/wishlist" [queryParams]="{ para: gift().forId, categoria: category()!.slug }">{{ category()!.name }}</a>
          }
        </p>
        <h1 class="gd-name">{{ gift().name }}</h1>
        <app-price class="gd-price" size="lg" [value]="gift().price" [currency]="gift().currency" />

        <p class="gd-priority">
          <span class="gd-pips" aria-hidden="true">
            @for (p of [1, 2, 3]; track p) {
              <span class="diamond" [class.off]="p > rank()"></span>
            }
          </span>
          <span><span class="sr-only">Prioridad: </span>{{ priorityLabel() }}</span>
        </p>

        @if (gift().description) {
          <p class="gd-desc">{{ gift().description }}</p>
        }

        <div class="gd-actions">
          @if (isMyWish()) {
            <div class="gd-owner">
              <p class="gd-owner-state">
                <span class="caps">Es uno de tus deseos</span>
              </p>
              <a class="btn btn-outline btn-sm" [routerLink]="['/admin/gifts', gift().id]">Editar regalo</a>
            </div>
            <p class="gd-owner-note">Para que sea sorpresa, no verás si alguien lo ha reservado.</p>
          } @else {
            <app-reserve-button [gift]="gift()" />
          }
          @if (gift().purchaseUrl) {
            <a class="gd-shop" [href]="gift().purchaseUrl" target="_blank" rel="noopener noreferrer external">
              Ver en la tienda <span aria-hidden="true">↗</span><span class="sr-only">(se abre en otra pestaña)</span>
            </a>
          }
        </div>
      </div>
    </article>
  `,
  styles: `
    .gd {
      display: grid;
      gap: 48px;
    }
    @media (min-width: 900px) {
      .gd {
        grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
        gap: clamp(48px, 7vw, 112px);
        align-items: start;
      }
      .gd-card {
        position: sticky;
        top: 112px;
        padding-top: 40px;
      }
    }
    .gd-window {
      aspect-ratio: 4 / 5;
      outline: 1px solid var(--color-gold);
      outline-offset: 10px;
      --pi-inset: 16% 9% 8%;
      --pi-x: 9%;
      --pi-h: 76%;
      --pi-fit: contain;
    }
    .gd-plaque {
      position: absolute;
      left: 50%;
      bottom: 22px;
      translate: -50% 0;
    }
    .gd-crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin: 0 0 28px;
      color: var(--color-ink-soft);
    }
    .gd-crumbs a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      text-decoration: none;
    }
    @media (hover: hover) and (pointer: fine) {
      .gd-crumbs a:hover {
        color: var(--color-cherry);
      }
    }
    .gd-name {
      margin: 0;
      font: 400 clamp(36px, 4.6vw, 64px) / 1.02 var(--font-display);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .gd-price {
      display: block;
      margin-top: 20px;
    }
    .gd-priority {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 24px 0 0;
      padding: 14px 0;
      border-block: 1px solid var(--color-line);
      font: italic 400 17px/1.4 var(--font-serif);
      color: var(--color-chocolate);
    }
    .gd-pips {
      display: inline-flex;
      gap: 7px;
    }
    .gd-pips .diamond {
      width: 7px;
      height: 7px;
    }
    .gd-pips .off {
      background: transparent;
      box-shadow: inset 0 0 0 1px var(--color-gold);
    }
    .gd-desc {
      margin: 24px 0 0;
      max-width: 34rem;
      font: 400 18px/1.7 var(--font-serif);
    }
    .gd-actions {
      display: grid;
      gap: 20px;
      margin-top: 36px;
    }
    .gd-owner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .gd-owner-state {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      margin: 0;
    }
    .gd-owner-note {
      margin: -4px 0 0;
      font: italic 400 15px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .gd-shop {
      justify-self: start;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      font: 500 12px/1 var(--font-sans);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      text-underline-offset: 6px;
    }
    @media (hover: hover) and (pointer: fine) {
      .gd-shop:hover {
        color: var(--color-cherry);
      }
    }
  `,
})
export class GiftDetail {
  readonly gift = input.required<Gift>();
  readonly category = input<Category | null>(null);
  readonly session = inject(Session);
  private readonly catalogue = inject(Catalogue);
  readonly mine = computed(() => this.catalogue.mine().has(this.gift().id));
  /** Your own wish: no reserve button, no status (the database doesn't even send it). */
  readonly isMyWish = computed(() => this.catalogue.isMine(this.gift()));
  readonly listName = computed(() => {
    const l = this.catalogue.list(this.gift().forId);
    return l ? (l.id === this.catalogue.meId() ? 'Tu lista' : `Lista de ${l.name}`) : 'Wishlist';
  });
  readonly rank = computed(() => PRIORITY_RANK[this.gift().priority]);
  readonly priorityLabel = computed(() => PRIORITY_LABEL[this.gift().priority]);
}
