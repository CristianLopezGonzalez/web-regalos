import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalogue } from '../../core/catalogue';
import { errorMessage } from '../../core/format';
import { Gift } from '../../core/models';
import { Session } from '../../core/session';
import { Toasts } from '../../core/toast';
import { WishlistApi } from '../../core/wishlist-api';
import { Modal } from '../../design-system/feedback/modal';
import { PriceLabel } from '../../design-system/gift/price-label';
import { AdminPageHead } from './admin-page-head';

/**
 * /admin: your list at a glance and the next useful actions. Never anything about the
 * reservations of your own list (the surprise). The owner also gets the reserved gifts of the
 * OTHER lists, to release stale ones.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, AdminPageHead, PriceLabel, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-page-head heading="Resumen" lede="Lo que te reserven es sorpresa: aquí no verás qué está reservado de tu lista ni quién lo ha hecho.">
      <a class="btn btn-primary btn-sm" routerLink="/admin/gifts/new">Añadir regalo</a>
    </app-admin-page-head>

    <dl class="db-stats">
      <div>
        <dt>Tus deseos</dt>
        <dd class="tabular">{{ loaded() ? stats().total : '–' }}</dd>
      </div>
      <div>
        <dt>Favoritos</dt>
        <dd class="tabular">{{ loaded() ? stats().favorites : '–' }}</dd>
      </div>
      <div>
        <dt>Para completar</dt>
        <dd class="tabular">{{ loaded() ? stats().todo : '–' }}</dd>
      </div>
    </dl>

    <div class="db-cols">
      @if (session.isOwner()) {
        <section aria-labelledby="res-h">
          <h2 id="res-h">Reservados en otras listas</h2>
          @if (!loaded()) {
            <div class="skeleton h-40" aria-hidden="true"></div>
          } @else if (reserved().length) {
            <ul class="db-list" role="list">
              @for (g of reserved(); track g.id) {
                <li>
                  <a [routerLink]="['/wishlist', g.id]" class="db-name">{{ g.name }} <span class="db-reason">· {{ listName(g) }}</span></a>
                  <app-price [value]="g.price" [currency]="g.currency" />
                  <button type="button" class="btn btn-ghost" (click)="toRelease.set(g)">Liberar<span class="sr-only"> {{ g.name }}</span></button>
                </li>
              }
            </ul>
          } @else {
            <p class="db-empty">En las otras listas no hay nada reservado todavía.</p>
          }
        </section>
      }

      <section aria-labelledby="todo-h">
        <h2 id="todo-h">Para completar</h2>
        @if (!loaded()) {
          <div class="skeleton h-40" aria-hidden="true"></div>
        } @else if (todo().length) {
          <ul class="db-list" role="list">
            @for (t of todo(); track t.gift.id + t.reason) {
              <li>
                <a [routerLink]="['/admin/gifts', t.gift.id]" class="db-name">{{ t.gift.name }}</a>
                <span class="db-reason">{{ t.reason }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="db-empty">Todos los regalos tienen foto, enlace y categoría.</p>
        }
        @if (session.isOwner()) {
          <p class="db-links">
            <a routerLink="/admin/invitations">Invitar a alguien</a>
            <span class="diamond" aria-hidden="true"></span>
            <a routerLink="/admin/categories">Ordenar categorías</a>
          </p>
        }
      </section>
    </div>

    <app-modal heading="¿Liberar este regalo?" [open]="!!toRelease()" (openChange)="!$event && toRelease.set(null)" [busy]="busy()">
      <p class="m-0">
        <strong>{{ toRelease()?.name }}</strong> volverá a aparecer como disponible. Quien lo reservó dejará de tenerlo en
        su perfil, y tú seguirás sin saber quién era. Úsalo, por ejemplo, después de Navidad.
      </p>
      <ng-container actions>
        <button type="button" class="btn btn-ghost" (click)="toRelease.set(null)" [disabled]="busy()">No</button>
        <button type="button" class="btn btn-danger" (click)="release()" [disabled]="busy()">{{ busy() ? 'Liberando…' : 'Sí, liberar' }}</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .db-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin: 0 0 clamp(56px, 7vw, 96px);
      border-block: 1px solid var(--color-line);
    }
    .db-stats > div {
      padding: clamp(20px, 3vw, 36px) clamp(8px, 2vw, 28px);
      text-align: center;
    }
    .db-stats > div + div {
      border-left: 1px solid var(--color-line);
    }
    dt {
      font: 500 11px/1.2 var(--font-sans);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
    }
    dd {
      margin: 10px 0 0;
      font: 400 clamp(48px, 8vw, 104px) / 1 var(--font-display);
      color: var(--color-burgundy);
    }
    .db-cols {
      display: grid;
      gap: 64px;
    }
    @media (min-width: 1100px) {
      .db-cols {
        grid-template-columns: 1fr 1fr;
        gap: 64px;
      }
    }
    h2 {
      margin: 0 0 8px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--color-line);
      font: 400 21px/1.1 var(--font-serif);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .db-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .db-list li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 16px;
      min-height: 60px;
      padding: 8px 0;
      border-bottom: 1px solid var(--color-line);
    }
    .db-name {
      flex: 1 1 12rem;
      font-size: 17px;
      text-decoration: none;
    }
    @media (hover: hover) and (pointer: fine) {
      .db-name:hover {
        color: var(--color-cherry);
        text-decoration: underline;
      }
    }
    .db-reason {
      font: italic 400 15px/1.4 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .db-empty {
      margin: 16px 0 0;
      font: italic 400 17px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .db-links {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
      margin: 28px 0 0;
    }
    .db-links a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      font: 500 12px/1 var(--font-sans);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      text-underline-offset: 6px;
    }
  `,
})
export class Dashboard {
  private readonly catalogue = inject(Catalogue);
  private readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);
  readonly session = inject(Session);
  readonly loaded = this.catalogue.loaded;
  /** Only YOUR gifts, and nothing about their reservations: that is the surprise. */
  private readonly myGifts = computed(() => (this.catalogue.meId() ? this.catalogue.giftsFor(this.catalogue.meId()!) : []));
  readonly stats = computed(() => ({
    total: this.myGifts().length,
    favorites: this.myGifts().filter((g) => g.isFavorite).length,
    todo: this.todoAll().length,
  }));
  /** Owner only: reserved gifts of OTHER lists, so a stale reservation can be released after Christmas. */
  readonly reserved = computed(() => (this.catalogue.gifts() ?? []).filter((g) => g.isReserved && !this.catalogue.isMine(g)));
  readonly listName = (g: Gift) => this.catalogue.list(g.forId)?.name ?? '';
  private readonly todoAll = computed(() =>
    this.myGifts().flatMap((g) => [
      ...(!g.image ? [{ gift: g, reason: 'Sin foto' }] : []),
      ...(!g.purchaseUrl ? [{ gift: g, reason: 'Sin enlace de compra' }] : []),
      ...(!g.categoryId ? [{ gift: g, reason: 'Sin categoría' }] : []),
    ]),
  );
  readonly todo = computed(() =>
    this.myGifts()
      .flatMap((g) => [
        ...(!g.image ? [{ gift: g, reason: 'Sin foto' }] : []),
        ...(!g.purchaseUrl ? [{ gift: g, reason: 'Sin enlace de compra' }] : []),
        ...(!g.categoryId ? [{ gift: g, reason: 'Sin categoría' }] : []),
      ])
      .slice(0, 6),
  );
  readonly toRelease = signal<Gift | null>(null);
  readonly busy = signal(false);

  async release() {
    const g = this.toRelease();
    if (!g) return;
    this.busy.set(true);
    try {
      await this.api.releaseGift(g.id);
      this.catalogue.setStatus(g.id, false);
      this.toasts.success(`${g.name} vuelve a estar disponible.`);
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
      this.toRelease.set(null);
    }
  }
}
