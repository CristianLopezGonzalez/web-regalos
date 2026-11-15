import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalogue } from '../../core/catalogue';
import { PRIORITY_LABEL } from '../../core/models';
import { PriceLabel } from '../../design-system/gift/price-label';
import { ProductImage } from '../../design-system/gift/product-image';
import { AdminPageHead } from './admin-page-head';

/**
 * /admin/gifts: an inventory ledger of YOUR list, not a data grid. Rows stack into cards on phones.
 * No reservation column: what you have been given is a surprise.
 */
@Component({
  selector: 'app-gifts-admin',
  imports: [RouterLink, AdminPageHead, PriceLabel, ProductImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-page-head heading="Mis regalos" lede="Los deseos de tu lista. Pulsa uno para editarlo. Lo que te reserven es sorpresa: aquí no aparece.">
      <a class="btn btn-primary btn-sm" routerLink="/admin/gifts/new">Añadir regalo</a>
    </app-admin-page-head>

    @if (!catalogue.loaded()) {
      <div class="grid gap-3" aria-busy="true" aria-label="Cargando regalos">
        @for (i of [0, 1, 2, 3, 4]; track i) {
          <div class="skeleton h-24"></div>
        }
      </div>
    } @else if (rows().length) {
      <table class="ga">
        <caption class="sr-only">Regalos de tu lista</caption>
        <thead>
          <tr>
            <th scope="col"><span class="sr-only">Foto</span></th>
            <th scope="col">Regalo</th>
            <th scope="col">Prioridad</th>
            <th scope="col" class="num">Precio</th>
          </tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.gift.id) {
            <tr>
              <td class="ga-thumb"><app-product-image [image]="r.gift.image" [alt]="r.gift.name" sizes="64px" /></td>
              <td class="ga-main">
                <a [routerLink]="['/admin/gifts', r.gift.id]" class="ga-name">{{ r.gift.name }}</a>
                <span class="ga-cat">
                  {{ r.category ?? 'Sin categoría' }}
                  @if (r.gift.isFavorite) {
                    <span class="diamond" aria-hidden="true"></span> Favorito
                  }
                </span>
              </td>
              <td class="ga-pri">{{ priority[r.gift.priority] }}</td>
              <td class="num"><app-price [value]="r.gift.price" [currency]="r.gift.currency" /></td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <div class="ga-empty">
        <p>Tu lista está vacía. Empieza por el regalo que más ilusión te haga.</p>
        <a class="btn btn-primary" routerLink="/admin/gifts/new">Añadir el primer regalo</a>
      </div>
    }
  `,
  styles: `
    .ga {
      width: 100%;
      border-collapse: collapse;
    }
    thead th {
      padding: 0 12px 14px;
      border-bottom: 1px solid var(--color-chocolate);
      text-align: left;
      font: 500 11px/1.2 var(--font-sans);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
    }
    td {
      padding: 14px 12px;
      border-bottom: 1px solid var(--color-line);
      vertical-align: middle;
    }
    .num {
      text-align: right;
    }
    .ga-thumb {
      width: 64px;
      padding-left: 0;
    }
    .ga-thumb app-product-image {
      width: 56px;
      aspect-ratio: 3 / 4;
    }
    .ga-name {
      display: block;
      font: 400 16px/1.3 var(--font-serif);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-decoration: none;
      color: var(--color-burgundy);
    }
    .ga-name::after {
      /* the whole row is the click target */
      content: '';
      position: absolute;
      inset: 0;
    }
    tbody tr {
      position: relative;
      transition: background-color 160ms ease;
    }
    @media (hover: hover) and (pointer: fine) {
      tbody tr:hover {
        background: var(--color-ivory);
      }
    }
    .ga-cat {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      font-size: 14px;
      color: var(--color-ink-soft);
    }
    .ga-pri {
      font: italic 400 15px/1.4 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .ga-empty {
      padding: 64px 0;
      text-align: center;
    }
    .ga-empty p {
      margin: 0 0 24px;
      font: italic 400 19px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
    @media (max-width: 767px) {
      thead {
        display: none;
      }
      tbody tr {
        display: grid;
        grid-template-columns: 56px minmax(0, 1fr) auto;
        gap: 4px 16px;
        padding: 16px 0;
        border-bottom: 1px solid var(--color-line);
      }
      td {
        padding: 0;
        border: 0;
      }
      .ga-thumb {
        grid-row: span 3;
      }
      .ga-main {
        grid-column: 2 / 4;
      }
      .ga-pri {
        grid-column: 2;
      }
      .num {
        grid-column: 3;
        grid-row: 2;
      }
    }
  `,
})
export class GiftsAdmin {
  readonly catalogue = inject(Catalogue);
  readonly priority = PRIORITY_LABEL;
  readonly rows = computed(() =>
    [...(this.catalogue.meId() ? this.catalogue.giftsFor(this.catalogue.meId()!) : [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((gift) => ({ gift, category: this.catalogue.category(gift.categoryId)?.name ?? null })),
  );
}
