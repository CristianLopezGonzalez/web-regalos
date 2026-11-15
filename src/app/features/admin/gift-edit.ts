import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Catalogue } from '../../core/catalogue';
import { errorMessage } from '../../core/format';
import { Gift } from '../../core/models';
import { Toasts } from '../../core/toast';
import { WishlistApi } from '../../core/wishlist-api';
import { Modal } from '../../design-system/feedback/modal';
import { AdminGiftForm } from '../../design-system/forms/admin-gift-form';
import { AdminPageHead } from './admin-page-head';

/**
 * /admin/gifts/new and /admin/gifts/:id — your own wishes only. No reservation status here:
 * it is a surprise (and the database doesn't send it for your own gifts anyway).
 */
@Component({
  selector: 'app-gift-edit',
  imports: [RouterLink, AdminPageHead, AdminGiftForm, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isNew() && !catalogue.loaded()) {
      <div class="skeleton h-96" aria-busy="true" aria-label="Cargando el regalo"></div>
    } @else if (!isNew() && !gift()) {
      @if (catalogue.gift(id()!)) {
        <app-admin-page-head heading="No es tuyo" lede="Solo puedes editar los regalos de tu propia lista." />
      } @else {
        <app-admin-page-head heading="No encontrado" lede="Este regalo ya no existe." />
      }
      <a class="btn btn-outline btn-sm" routerLink="/admin/gifts">Volver a mis regalos</a>
    } @else {
      <app-admin-page-head
        [heading]="isNew() ? 'Nuevo regalo' : 'Editar regalo'"
        [lede]="isNew() ? 'Aparecerá en tu lista en cuanto lo guardes.' : 'Si alguien lo ha reservado, no lo sabrás: es sorpresa.'"
      >
        @if (gift(); as g) {
          <a class="btn btn-ghost" [routerLink]="['/wishlist', g.id]">Ver en la wishlist</a>
        }
      </app-admin-page-head>

      <app-admin-gift-form [gift]="gift()" [categories]="catalogue.categories() ?? []" (saved)="onSaved($event)">
        @if (gift()) {
          <button type="button" class="btn btn-ghost ge-delete" (click)="deleteOpen.set(true)">Borrar regalo</button>
        } @else {
          <a class="btn btn-ghost" routerLink="/admin/gifts">Cancelar</a>
        }
      </app-admin-gift-form>

      <app-modal heading="¿Borrar este regalo?" [(open)]="deleteOpen" [busy]="busy()">
        <p class="m-0">
          <strong>{{ gift()?.name }}</strong> desaparecerá de tu lista. Si alguien lo había reservado, dejará de
          tenerlo. No se puede deshacer.
        </p>
        <ng-container actions>
          <button type="button" class="btn btn-ghost" (click)="deleteOpen.set(false)" [disabled]="busy()">No, mantener</button>
          <button type="button" class="btn btn-danger" (click)="remove()" [disabled]="busy()">{{ busy() ? 'Borrando…' : 'Borrar' }}</button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `
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
  /** Only your own wishes can be edited (the database enforces it too). */
  readonly gift = computed(() => {
    const g = this.id() ? this.catalogue.gift(this.id()!) : null;
    return g && this.catalogue.isMine(g) ? g : null;
  });
  readonly deleteOpen = signal(false);
  readonly busy = signal(false);

  onSaved(g: Gift) {
    this.catalogue.upsert(g);
    this.toasts.success(this.isNew() ? 'Regalo añadido a tu lista.' : 'Cambios guardados.');
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
}
