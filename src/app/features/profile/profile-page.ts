import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Catalogue } from '../../core/catalogue';
import { DemoApi } from '../../core/demo-api';
import { errorMessage, formatDate } from '../../core/format';
import { Gift } from '../../core/models';
import { Session } from '../../core/session';
import { Toasts } from '../../core/toast';
import { WishlistApi } from '../../core/wishlist-api';
import { InstallApp } from '../../design-system/feedback/install-app';
import { Modal } from '../../design-system/feedback/modal';
import { PriceLabel } from '../../design-system/gift/price-label';
import { ProductImage } from '../../design-system/gift/product-image';

/** /profile: name, account, "Mis reservas" (everyone can reserve, except their own wishes), sign out. */
@Component({
  selector: 'app-profile-page',
  imports: [FormsModule, RouterLink, PriceLabel, ProductImage, Modal, InstallApp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (session.profile(); as p) {
      <div class="wrap pf">
        <header class="pf-head">
          <h1>Perfil</h1>
          <p class="pf-sub">{{ p.role === 'owner' ? 'Administras la wishlist' : p.hasList ? 'Con tu propia lista' : 'Familia' }} · desde el {{ since() }}</p>
        </header>

        <div class="pf-grid">
          <section aria-labelledby="acc-h" class="pf-card">
            <h2 id="acc-h">Tu cuenta</h2>
            <form class="grid gap-6" (ngSubmit)="saveName()">
              <div class="field">
                <label class="field-label" for="pf-name">Nombre</label>
                <input id="pf-name" class="input" name="displayName" [(ngModel)]="name" required maxlength="60" autocomplete="given-name" aria-describedby="pf-name-msg" [attr.aria-invalid]="nameError() ? true : null" />
                @if (nameError()) {
                  <p class="field-error" id="pf-name-msg">{{ nameError() }}</p>
                } @else {
                  <p class="field-hint" id="pf-name-msg">{{ p.hasList ? 'Así se llama tu lista para los demás.' : 'Así te ve quien administra la wishlist. Nunca junto a tus reservas.' }}</p>
                }
              </div>
              <div class="field">
                <span class="field-label">Email</span>
                <p class="m-0 text-[17px]">{{ p.email }}</p>
              </div>
              <div class="flex flex-wrap gap-4 items-center">
                <button type="submit" class="btn btn-outline btn-sm" [disabled]="saving() || name().trim() === p.displayName">{{ saving() ? 'Guardando…' : 'Guardar nombre' }}</button>
                <button type="button" class="btn btn-ghost" (click)="signOut()">Cerrar sesión</button>
              </div>
            </form>
            <app-install-app class="pf-install" />
            @if (api.isDemo) {
              <div class="pf-demo">
                <p class="field-hint">Modo demo: los datos viven en este navegador.</p>
                <button type="button" class="btn btn-ghost" (click)="resetDemo()">Restablecer la demo</button>
              </div>
            }
          </section>

          @if (p) {
            <section aria-labelledby="mine-h">
              <h2 id="mine-h">Mis reservas</h2>
              <p class="pf-note">Solo tú ves esta lista. Los demás ven «Reservado», sin nombre.</p>
              @if (!catalogue.loaded()) {
                <div class="skeleton h-28" aria-hidden="true"></div>
              } @else if (mine().length) {
                <ul class="pf-list" role="list">
                  @for (g of mine(); track g.id) {
                    <li class="pf-item">
                      <a class="pf-thumb" [routerLink]="['/wishlist', g.id]" tabindex="-1" aria-hidden="true">
                        <app-product-image [image]="g.image" [alt]="g.name" sizes="88px" />
                      </a>
                      <div class="min-w-0">
                        <a class="pf-name" [routerLink]="['/wishlist', g.id]">{{ g.name }}</a>
                        <app-price class="block mt-1" [value]="g.price" [currency]="g.currency" />
                        @if (g.purchaseUrl) {
                          <a class="pf-shop" [href]="g.purchaseUrl" target="_blank" rel="noopener noreferrer external">Ver en la tienda ↗<span class="sr-only"> (se abre en otra pestaña)</span></a>
                        }
                      </div>
                      <button type="button" class="btn btn-ghost pf-cancel" (click)="toCancel.set(g)">Cancelar<span class="sr-only"> la reserva de {{ g.name }}</span></button>
                    </li>
                  }
                </ul>
              } @else {
                <div class="pf-empty">
                  <p>Todavía no has reservado nada.</p>
                  <a class="btn btn-primary btn-sm" routerLink="/wishlist">Ver la wishlist</a>
                </div>
              }
            </section>
          } @else {
            <section aria-labelledby="own-h">
              <h2 id="own-h">Tu lista</h2>
              <p class="pf-note">Gestiona regalos, categorías e invitaciones desde la trastienda.</p>
              <a class="btn btn-primary btn-sm" routerLink="/admin">Ir a la trastienda</a>
            </section>
          }
        </div>
      </div>

      <app-modal heading="¿Cancelar la reserva?" [open]="!!toCancel()" (openChange)="!$event && toCancel.set(null)" [busy]="busy()">
        <p class="m-0">{{ toCancel()?.name }} volverá a estar disponible para el resto de la familia.</p>
        <ng-container actions>
          <button type="button" class="btn btn-ghost" (click)="toCancel.set(null)" [disabled]="busy()">Mantener</button>
          <button type="button" class="btn btn-danger" (click)="cancel()" [disabled]="busy()">{{ busy() ? 'Cancelando…' : 'Cancelar reserva' }}</button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `
    .pf {
      padding-block: clamp(56px, 8vw, 112px) clamp(96px, 12vw, 160px);
    }
    .pf-head {
      margin-bottom: clamp(48px, 7vw, 88px);
    }
    h1 {
      margin: 0;
      font: 400 clamp(48px, 8vw, 104px) / 0.95 var(--font-display);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .pf-sub {
      margin: 16px 0 0;
      font: italic 400 18px/1.4 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .pf-grid {
      display: grid;
      gap: 72px;
    }
    @media (min-width: 960px) {
      .pf-grid {
        grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
        gap: clamp(64px, 8vw, 128px);
      }
    }
    h2 {
      margin: 0 0 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--color-line);
      font: 400 21px/1.1 var(--font-serif);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .pf-note {
      margin: -8px 0 24px;
      font: italic 400 16px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .pf-install {
      display: block;
      margin-top: 28px;
    }
    .pf-demo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 16px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px dashed var(--color-line);
    }
    .pf-list {
      display: grid;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .pf-item {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr) auto;
      gap: 20px;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid var(--color-line);
    }
    .pf-thumb app-product-image {
      aspect-ratio: 3 / 4;
    }
    .pf-name {
      font: 400 16px/1.3 var(--font-serif);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-decoration: none;
      color: var(--color-burgundy);
    }
    .pf-shop {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      font-size: 13px;
      letter-spacing: 0.08em;
      color: var(--color-ink-soft);
    }
    .pf-empty p {
      margin: 0 0 20px;
      font: italic 400 19px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
  `,
})
export class ProfilePage {
  readonly session = inject(Session);
  readonly catalogue = inject(Catalogue);
  readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);
  private readonly router = inject(Router);

  readonly name = signal('');
  readonly saving = signal(false);
  readonly busy = signal(false);
  readonly toCancel = signal<Gift | null>(null);
  readonly nameError = computed(() => (this.name().trim() ? null : 'Escribe un nombre.'));

  readonly since = computed(() => {
    const p = this.session.profile();
    return p ? formatDate(p.createdAt) : '';
  });
  readonly mine = computed(() => (this.catalogue.gifts() ?? []).filter((g) => this.catalogue.mine().has(g.id)));

  constructor() {
    effect(() => this.name.set(this.session.profile()?.displayName ?? ''));
  }

  async saveName() {
    if (this.nameError()) return;
    this.saving.set(true);
    try {
      await this.api.updateDisplayName(this.name());
      this.toasts.success('Nombre guardado.');
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  async cancel() {
    const g = this.toCancel();
    if (!g) return;
    this.busy.set(true);
    try {
      await this.catalogue.cancel(g.id);
      this.toasts.show('Reserva cancelada. Vuelve a estar disponible.');
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
      this.toCancel.set(null);
    }
  }

  async signOut() {
    await this.api.signOut();
    this.toasts.show('Has cerrado sesión.');
    void this.router.navigateByUrl('/');
  }

  async resetDemo() {
    if (this.api instanceof DemoApi) {
      await this.api.signOut();
      await this.api.reset();
      this.toasts.show('Demo restablecida.');
      void this.router.navigateByUrl('/login');
    }
  }
}
