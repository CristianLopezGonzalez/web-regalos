import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * The brass plaque. "Reservado" for everyone, "Lo has reservado tú" for the person who did.
 * `available` is only rendered where the owner needs to read the state (admin).
 */
@Component({
  selector: 'app-reservation-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"rb rb--" + state() + " rb--" + tone()' },
  template: `{{ label() }}`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 14px;
      font: 500 11px/1 var(--font-sans);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    :host(.rb--reserved),
    :host(.rb--mine) {
      background: var(--color-night);
      border: 1px solid var(--color-gold);
      color: var(--color-ivory);
    }
    :host(.rb--mine) {
      background: var(--color-burgundy);
    }
    :host(.rb--available) {
      border: 1px solid var(--color-line);
      color: var(--color-ink-soft);
    }
    :host(.rb--available)::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-gold);
    }
    :host(.rb--quiet.rb--available) {
      border: 0;
      padding-inline: 0;
    }
  `,
})
export class ReservationBadge {
  readonly reserved = input.required<boolean>();
  readonly mine = input(false);
  readonly tone = input<'plaque' | 'quiet'>('plaque');
  readonly state = computed(() => (this.mine() && this.reserved() ? 'mine' : this.reserved() ? 'reserved' : 'available'));
  readonly label = computed(() =>
    this.state() === 'mine' ? 'Lo has reservado tú' : this.state() === 'reserved' ? 'Reservado' : 'Disponible',
  );
}
