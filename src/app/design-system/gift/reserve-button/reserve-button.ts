import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { errorMessage } from '@app/core/api/error-message';
import { ApiError } from '@app/core/api/api-error';
import { Gift } from '@app/core/models/gift';
import { Session } from '@app/core/auth/session';
import { Toasts } from '@app/core/toast/toasts';
import { Modal } from '../../feedback/modal/modal';

/**
 * The reservation control, for everyone except on their own wishes (those stay a surprise).
 *  available     → "Reservar este regalo" → confirm → plaque appears
 *  mine          → "Lo has reservado tú" + cancel
 *  reserved      → disabled, with the reason
 * The database decides; on a race the loser gets GIFT_ALREADY_RESERVED and the button shakes.
 */
@Component({
  selector: 'app-reserve-button',
  imports: [Modal, RouterLink],
  host: { class: 'block' },
  templateUrl: './reserve-button.html',
  styleUrl: './reserve-button.css',
})
export class ReserveButton {
  private readonly session = inject(Session);
  private readonly catalogue = inject(Catalogue);
  private readonly toasts = inject(Toasts);

  readonly gift = input.required<Gift>();

  protected readonly confirm = signal(false);
  protected readonly cancelOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly shake = signal(false);
  /** Never on your own wishes (the database refuses it too). */
  protected readonly canReserve = computed(
    () => !!this.session.profile() && !this.catalogue.isMine(this.gift()),
  );
  protected readonly recipient = computed(
    () => this.catalogue.list(this.gift().forId)?.name ?? 'la persona de la lista',
  );

  protected readonly state = computed(() =>
    this.catalogue.mine().has(this.gift().id)
      ? 'mine'
      : this.gift().isReserved
        ? 'reserved'
        : 'available',
  );

  protected async reserve() {
    this.busy.set(true);
    try {
      await this.catalogue.reserve(this.gift().id);
      this.toasts.success('Reservado. Gracias por hacerlo especial.');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'GIFT_ALREADY_RESERVED') this.shake.set(true);
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
      this.confirm.set(false);
    }
  }

  protected async cancel() {
    this.busy.set(true);
    try {
      await this.catalogue.cancel(this.gift().id);
      this.toasts.show('Reserva cancelada. Vuelve a estar disponible.');
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
      this.cancelOpen.set(false);
    }
  }
}
