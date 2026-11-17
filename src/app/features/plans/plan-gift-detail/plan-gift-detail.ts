import { Component, computed, inject, input, output, signal } from '@angular/core';
import { errorMessage } from '@app/core/api/error-message';
import { formatPrice } from '@app/core/format/price-format';
import { PLAN_STATUSES, PLAN_STATUS_LABEL, PlanGift, PlanStatus } from '@app/core/models/plan';
import { Toasts } from '@app/core/toast/toasts';
import { ProductImage } from '@app/design-system/gift/product-image/product-image';
import { PlansStore } from '../plans-store';

/**
 * One planned present, inside a dialog: for whom, price, note, where it is (a three-step track
 * you can press), who puts what and who paid. Footer: delete (asks first) and edit.
 */
@Component({
  selector: 'app-plan-gift-detail',
  imports: [ProductImage],
  host: { class: 'block' },
  templateUrl: './plan-gift-detail.html',
  styleUrl: './plan-gift-detail.css',
})
export class PlanGiftDetail {
  protected readonly store = inject(PlansStore);
  private readonly toasts = inject(Toasts);

  readonly gift = input.required<PlanGift>();
  readonly edit = output<void>();
  readonly deleted = output<void>();

  protected readonly steps = PLAN_STATUSES;
  protected readonly stepLabel = PLAN_STATUS_LABEL;
  protected readonly confirming = signal(false);
  protected readonly busy = signal(false);

  protected readonly person = computed(() => this.store.person(this.gift().personId));
  protected readonly stepIndex = computed(() => PLAN_STATUSES.indexOf(this.gift().status));
  private readonly meId = computed(() => this.store.meId() ?? '');
  private readonly other = computed(() => this.store.other());
  protected readonly otherName = computed(() => this.other()?.name ?? '');
  protected readonly mine = computed(() => this.gift().shares[this.meId()] ?? 0);
  protected readonly theirs = computed(() => this.gift().shares[this.other()?.id ?? ''] ?? 0);
  protected readonly myPct = computed(() => {
    const p = this.gift().price;
    return p > 0 ? Math.round((this.mine() / p) * 100) : 50;
  });

  /** "Lo pagaste tú · Ángela te debe 30 € por este regalo." */
  protected readonly paidLine = computed(() => {
    const g = this.gift();
    const other = this.otherName();
    if (!g.paidBy) return 'Aún sin pagar.';
    if (g.paidBy === this.meId()) {
      return this.theirs() > 0
        ? `Lo pagaste tú · ${other} te debe ${this.money(this.theirs())} por este regalo.`
        : 'Lo pagaste tú, entero.';
    }
    return this.mine() > 0
      ? `Lo pagó ${other} · le debes ${this.money(this.mine())} por este regalo.`
      : `Lo pagó ${other}, entero.`;
  });

  protected money(n: number) {
    return formatPrice(n, this.gift().currency);
  }

  protected async setStatus(s: PlanStatus) {
    try {
      await this.store.setStatus(this.gift().id, s);
    } catch (e) {
      this.toasts.error(errorMessage(e));
    }
  }

  protected async remove() {
    this.busy.set(true);
    try {
      const name = this.gift().name;
      await this.store.deleteGift(this.gift().id);
      this.toasts.success(`${name} borrado.`);
      this.deleted.emit();
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
      this.confirming.set(false);
    }
  }
}
