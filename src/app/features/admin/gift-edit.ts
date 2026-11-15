import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Catalogue } from '../../core/catalogue';
import { errorMessage } from '../../core/format';
import { Gift } from '../../core/models';
import { Toasts } from '../../core/toast';
import { WishlistApi } from '../../core/wishlist-api';
import { Modal } from '../../design-system/feedback/modal';
import { AdminGiftForm } from '../../design-system/forms/admin-gift-form';
import { ReservationBadge } from '../../design-system/gift/reservation-badge';
import { AdminPageHead } from './admin-page-head';

/** /admin/gifts/new and /admin/gifts/:id */
@Component({
  selector: 'app-gift-edit',
  imports: [RouterLink, AdminPageHead, AdminGiftForm, Modal, ReservationBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isNew() && !catalogue.loaded()) {
      <div class="skeleton h-96" aria-busy="true" aria-label="Cargando el regalo"></div>
    } @else if (!isNew() && !gift()) {
      <app-admin-page-head heading="No encontrado" lede="Este regalo ya no existe." />
      <a class="btn btn-outline btn-sm" routerLink="/admin/gifts">Volver a regalos</a>
    } @else {
      <app-admin-page-head [heading]="isNew() ? 'Nuevo regalo' : 'Editar regalo'" [lede]="isNew() ? 'Aparecerá en la wishlist en cuanto lo guardes.' : null">
        @if (gift(); as g) {
          <a class="btn btn-ghost" [routerLink]="['/wishlist', g.id]">Ver como la familia</a>
        }
      </app-admin-page-head>

      @if (gift(); as g) {
        <div class="ge-status">
          <app-reservation-badge [reserved]="g.isReserved" />
          @if (g.isReserved) {
            <span>Alguien de la familia lo ha reservado. No sabrás quién.</span>
            <button type="button" class="btn btn-ghost" (click)="releaseOpen.set(true)">Liberar</button>
          }
        </div>
      }

      <app-admin-gift-form [gift]="gift()" [categories]="catalogue.categories() ?? []" (saved)="onSaved($event)">
        @if (gift()) {
          <button type="button" class="btn btn-ghost ge-delete" (click)="deleteOpen.set(true)">Borrar regalo</button>
        } @else {
          <a class="btn btn-ghost" routerLink="/admin/gifts">Cancelar</a>
        }
      </app-admin-gift-form>

      <app-modal heading="¿Borrar este regalo?" [(open)]="deleteOpen" [busy]="busy()">
        <p class="m-0">
          <strong>{{ gift()?.name }}</strong> desaparecerá de la wishlist.
          @if (gift()?.isReserved) {
            Está reservado: quien lo reservó verá que ya no está en la lista.
          }
          No se puede deshacer.
        </p>
        <ng-container actions>
          <button type="button" class="btn btn-ghost" (click)="deleteOpen.set(false)" [disabled]="busy()">No, mantener</button>
          <button type="button" class="btn btn-danger" (click)="remove()" [disabled]="busy()">{{ busy() ? 'Borrando…' : 'Borrar' }}</button>
        </ng-container>
      </app-modal>

      <app-modal heading="¿Liberar este regalo?" [(open)]="releaseOpen" [busy]="busy()">
        <p class="m-0">Volverá a aparecer como disponible para toda la familia. Seguirás sin saber quién lo había reservado.</p>
        <ng-container actions>
          <button type="button" class="btn btn-ghost" (click)="releaseOpen.set(false)" [disabled]="busy()">No</button>
          <button type="button" class="btn btn-danger" (click)="release()" [disabled]="busy()">{{ busy() ? 'Liberando…' : 'Sí, liberar' }}</button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `
    .ge-status {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
      margin: -16px 0 40px;
      font: italic 400 16px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .ge-delete {
      color: var(--color-cherry);
    }
  `,
})
export class GiftEdit {
  readonly id = input<string | undefined>();
  readonly catalogue = inject(Catalogue);
  private readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  readonly isNew = computed(() => !this.id());
  readonly gift = computed(() => (this.id() ? this.catalogue.gift(this.id()!) : null));
  readonly deleteOpen = signal(false);
  readonly releaseOpen = signal(false);
  readonly busy = signal(false);

  onSaved(g: Gift) {
    this.catalogue.upsert(g);
    this.toasts.success(this.isNew() ? 'Regalo añadido a la wishlist.' : 'Cambios guardados.');
    if (this.isNew()) void this.router.navigate(['/admin/gifts', g.id], { replaceUrl: true });
  }

  async remove() {
    const g = this.gift();
    if (!g) return;
    this.busy.set(true);
    try {
      await this.api.deleteGift(g.id);
      this.deleteOpen.set(false);
      this.catalogue.remove(g.id);
      this.toasts.show('Regalo borrado.');
      void this.router.navigateByUrl('/admin/gifts');
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  async release() {
    const g = this.gift();
    if (!g) return;
    this.busy.set(true);
    try {
      await this.api.releaseGift(g.id);
      this.catalogue.setStatus(g.id, false);
      this.toasts.success('Vuelve a estar disponible.');
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
      this.releaseOpen.set(false);
    }
  }
}
