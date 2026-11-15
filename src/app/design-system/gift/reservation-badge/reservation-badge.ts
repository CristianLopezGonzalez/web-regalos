import { Component, computed, input } from '@angular/core';

/**
 * The brass plaque. "Reservado" for everyone, "Lo has reservado tú" for the person who did.
 * `available` is only rendered where the owner needs to read the state (admin).
 */
@Component({
  selector: 'app-reservation-badge',
  host: { '[class]': '"rb rb--" + state() + " rb--" + tone()' },
  templateUrl: './reservation-badge.html',
  styleUrl: './reservation-badge.css',
})
export class ReservationBadge {
  readonly reserved = input.required<boolean>();
  readonly mine = input(false);
  readonly tone = input<'plaque' | 'quiet'>('plaque');

  protected readonly state = computed(() =>
    this.mine() && this.reserved() ? 'mine' : this.reserved() ? 'reserved' : 'available',
  );
  protected readonly label = computed(() =>
    this.state() === 'mine'
      ? 'Lo has reservado tú'
      : this.state() === 'reserved'
        ? 'Reservado'
        : 'Disponible',
  );
}
