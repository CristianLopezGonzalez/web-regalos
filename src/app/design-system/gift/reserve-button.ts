import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalogue } from '../../core/catalogue';
import { errorMessage } from '../../core/format';
import { ApiError, Gift } from '../../core/models';
import { Session } from '../../core/session';
import { Toasts } from '../../core/toast';
import { Modal } from '../feedback/modal';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (canReserve()) {
      @switch (state()) {
        @case ('available') {
          <button type="button" class="btn btn-primary rb-main" [class.animate-shake]="shake()" (animationend)="shake.set(false)" (click)="confirm.set(true)">
            Reservar este regalo
          </button>
          <p class="rb-note">Nadie sabrá que has sido tú, ni siquiera {{ recipient() }}.</p>
        }
        @case ('mine') {
          <div class="rb-mine">
            <p class="rb-mine-line"><span class="diamond" aria-hidden="true"></span> Lo has reservado tú</p>
            <button type="button" class="btn btn-ghost" (click)="cancelOpen.set(true)">Cancelar mi reserva</button>
          </div>
          <p class="rb-note">Lo encontrarás también en <a routerLink="/profile">tu perfil</a>.</p>
        }
        @case ('reserved') {
          <button type="button" class="btn btn-primary rb-main" disabled aria-describedby="rb-why">Ya está reservado</button>
          <p class="rb-note" id="rb-why">Otra persona se ha adelantado. Hay más deseos en la lista.</p>
        }
      }

      <app-modal heading="¿Lo reservas?" [(open)]="confirm" [busy]="busy()">
        <p class="m-0">
          Vas a reservar <strong>{{ gift().name }}</strong>. Los demás verán que está reservado, pero no quién lo ha
          hecho. Podrás cancelarlo cuando quieras desde tu perfil.
        </p>
        <ng-container actions>
          <button type="button" class="btn btn-ghost" (click)="confirm.set(false)" [disabled]="busy()">Ahora no</button>
          <button type="button" class="btn btn-primary" (click)="reserve()" [disabled]="busy()" [attr.aria-busy]="busy()">
            @if (busy()) {
              <span class="spin" aria-hidden="true"></span> Reservando…
            } @else {
              Sí, lo reservo
            }
          </button>
        </ng-container>
      </app-modal>

      <app-modal heading="¿Cancelar la reserva?" [(open)]="cancelOpen" [busy]="busy()">
        <p class="m-0">{{ gift().name }} volverá a estar disponible para el resto de la familia.</p>
        <ng-container actions>
          <button type="button" class="btn btn-ghost" (click)="cancelOpen.set(false)" [disabled]="busy()">Mantener</button>
          <button type="button" class="btn btn-danger" (click)="cancel()" [disabled]="busy()">
            @if (busy()) {
              <span class="spin" aria-hidden="true"></span> Cancelando…
            } @else {
              Cancelar reserva
            }
          </button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `
    .rb-main {
      width: 100%;
    }
    .rb-note {
      margin: 12px 0 0;
      font: italic 400 15px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .rb-mine {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px 20px;
      padding: 10px 10px 10px 20px;
      background: var(--color-burgundy);
      color: var(--color-ivory);
      border: 1px solid var(--color-gold);
    }
    .rb-mine-line {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font: 500 13px/1 var(--font-sans);
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    .rb-mine .btn-ghost {
      color: var(--color-ivory);
    }
    .spin {
      width: 14px;
      height: 14px;
      border: 1.5px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 700ms linear infinite;
    }
    @keyframes spin {
      to {
        rotate: 360deg;
      }
    }
  `,
})
export class ReserveButton {
  readonly gift = input.required<Gift>();
  readonly session = inject(Session);
  private readonly catalogue = inject(Catalogue);
  private readonly toasts = inject(Toasts);

  readonly confirm = signal(false);
  readonly cancelOpen = signal(false);
  readonly busy = signal(false);
  readonly shake = signal(false);
  /** Never on your own wishes (the database refuses it too). */
  readonly canReserve = computed(() => !!this.session.profile() && !this.catalogue.isMine(this.gift()));
  readonly recipient = computed(() => this.catalogue.list(this.gift().forId)?.name ?? 'la persona de la lista');

  readonly state = computed(() =>
    this.catalogue.mine().has(this.gift().id) ? 'mine' : this.gift().isReserved ? 'reserved' : 'available',
  );

  async reserve() {
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

  async cancel() {
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
