import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '@app/core/api/error-message';
import { formatPrice } from '@app/core/format/price-format';
import { PlanPerson } from '@app/core/models/plan';
import { PlanPersonDialog } from '../plan-person-dialog/plan-person-dialog';
import { round2 } from '../plan-math';
import { PlansStore } from '../plans-store';

/**
 * /plans: "Nuestros regalos". What Cristian and Ángela are going to give the family, the totals,
 * who owes whom, and one card per person. Only the two planners ever get here (guard + RLS).
 */
@Component({
  selector: 'app-plans-page',
  imports: [RouterLink, PlanPersonDialog],
  templateUrl: './plans-page.html',
  styleUrl: './plans-page.css',
})
export class PlansPage {
  protected readonly store = inject(PlansStore);
  private readonly router = inject(Router);

  protected readonly adding = signal(false);
  protected readonly errorText = computed(() => errorMessage(this.store.error()));
  protected readonly otherName = computed(() => this.store.other()?.name ?? 'tu pareja');

  protected readonly cards = computed(() =>
    (this.store.people() ?? []).map((p) => {
      const gifts = this.store.giftsFor(p.id);
      const bought = gifts.filter((g) => g.status !== 'idea');
      const total = round2(gifts.reduce((s, g) => s + g.price, 0));
      const spent = round2(bought.reduce((s, g) => s + g.price, 0));
      const goal = p.budget ?? total;
      const sum = this.store.summaryFor(p.id);
      const me = this.store.meId() ?? '';
      const other = this.store.other()?.id ?? '';
      const pending = gifts.find((g) => g.status === 'idea');
      return {
        person: p,
        initial: initialOf(p.name),
        summary: `${count(gifts.length, 'regalo', 'regalos')}${p.budget !== null ? ` · presupuesto ${money(p.budget)}` : ''}`,
        bought: gifts.length
          ? bought.length === gifts.length
            ? count(gifts.length, 'comprado', 'comprados', 'Todo comprado')
            : `${bought.length} de ${gifts.length} comprados`
          : 'Aún sin ideas',
        money: p.budget !== null ? `${money(spent)} / ${money(p.budget)}` : money(spent),
        progress: `${goal > 0 ? Math.min(100, Math.round((spent / goal) * 100)) : 0}%`,
        split: gifts.length
          ? `Tú ${money(sum.puts[me] ?? 0)} · ${this.otherName()} ${money(sum.puts[other] ?? 0)}`
          : '',
        next: !gifts.length
          ? 'Añade la primera idea.'
          : pending
            ? `Falta: ${pending.name}`
            : gifts.every((g) => g.status === 'wrapped')
              ? 'Todo listo y envuelto.'
              : 'Todo comprado, falta envolver.',
      };
    }),
  );

  protected readonly myPuts = computed(
    () => this.store.summary().puts[this.store.meId() ?? ''] ?? 0,
  );
  protected readonly myPaid = computed(
    () => this.store.summary().paid[this.store.meId() ?? ''] ?? 0,
  );
  protected readonly otherPuts = computed(
    () => this.store.summary().puts[this.store.other()?.id ?? ''] ?? 0,
  );
  protected readonly otherPaid = computed(
    () => this.store.summary().paid[this.store.other()?.id ?? ''] ?? 0,
  );

  protected money(n: number) {
    return money(n);
  }

  protected onAdded(p: PlanPerson) {
    void this.router.navigate(['/plans', p.id]);
  }
}

const money = (n: number) => formatPrice(n, 'EUR');
const count = (n: number, one: string, many: string, all?: string) =>
  all && n > 0 ? all : `${n} ${n === 1 ? one : many}`;
export const initialOf = (name: string) => name.trim().charAt(0).toLocaleUpperCase('es') || '·';
