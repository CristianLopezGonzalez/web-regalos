import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '@app/core/api/error-message';
import { formatPrice } from '@app/core/format/price-format';
import { Toasts } from '@app/core/toast/toasts';
import { PLAN_STATUSES, PLAN_STATUS_LABEL, PlanGift, PlanStatus } from '@app/core/models/plan';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { PriceLabel } from '@app/design-system/gift/price-label/price-label';
import { ProductImage } from '@app/design-system/gift/product-image/product-image';
import { PlanPersonDialog } from '../plan-person-dialog/plan-person-dialog';
import { round2 } from '../plan-math';
import { initialOf } from '../plans-page/plans-page';
import { PlansStore } from '../plans-store';

type Filter = 'todos' | PlanStatus;
const FILTER_PARAM: Record<string, Filter> = {
  ideas: 'idea',
  comprados: 'bought',
  envueltos: 'wrapped',
};

/**
 * /plans/:personId?estado=ideas|comprados|envueltos — everything we plan to give one person:
 * budget, what each of us puts in, and the presents with their status and who paid.
 */
@Component({
  selector: 'app-plan-person-page',
  imports: [RouterLink, Modal, PriceLabel, ProductImage, PlanPersonDialog],
  templateUrl: './plan-person-page.html',
  styleUrl: './plan-person-page.css',
})
export class PlanPersonPage {
  protected readonly store = inject(PlansStore);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  readonly personId = input.required<string>();
  /** ?estado= */
  readonly estado = input<string | undefined>();

  protected readonly statuses = PLAN_STATUSES;
  protected readonly statusLabel = PLAN_STATUS_LABEL;

  protected readonly editing = signal(false);
  protected readonly confirmDeletePerson = signal(false);
  protected readonly toDelete = signal<PlanGift | null>(null);
  protected readonly busy = signal(false);

  protected readonly person = computed(() => this.store.person(this.personId()));
  protected readonly initial = computed(() => initialOf(this.person()?.name ?? ''));
  protected readonly otherName = computed(() => this.store.other()?.name ?? 'tu pareja');
  protected readonly gifts = computed(() =>
    [...this.store.giftsFor(this.personId())].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    ),
  );
  protected readonly filter = computed<Filter>(() => FILTER_PARAM[this.estado() ?? ''] ?? 'todos');
  protected readonly visible = computed(() =>
    this.filter() === 'todos'
      ? this.gifts()
      : this.gifts().filter((g) => g.status === this.filter()),
  );
  protected readonly tabs = computed(() => {
    const all = this.gifts();
    const n = (s: PlanStatus) => all.filter((g) => g.status === s).length;
    return [
      { label: 'Todos', param: null, filter: 'todos' as Filter, count: all.length },
      { label: 'Ideas', param: 'ideas', filter: 'idea' as Filter, count: n('idea') },
      { label: 'Comprados', param: 'comprados', filter: 'bought' as Filter, count: n('bought') },
      { label: 'Envueltos', param: 'envueltos', filter: 'wrapped' as Filter, count: n('wrapped') },
    ];
  });

  protected readonly money = computed(() => {
    const gifts = this.gifts();
    const bought = gifts.filter((g) => g.status !== 'idea');
    const total = round2(gifts.reduce((s, g) => s + g.price, 0));
    const spent = round2(bought.reduce((s, g) => s + g.price, 0));
    const budget = this.person()?.budget ?? null;
    const goal = budget ?? total;
    const sum = this.store.summaryFor(this.personId());
    return {
      count: gifts.length,
      bought: bought.length,
      total,
      spent,
      budget,
      progress: `${goal > 0 ? Math.min(100, Math.round((spent / goal) * 100)) : 0}%`,
      mine: sum.puts[this.store.meId() ?? ''] ?? 0,
      theirs: sum.puts[this.store.other()?.id ?? ''] ?? 0,
    };
  });

  protected readonly summaryLine = computed(() => {
    const m = this.money();
    if (!m.count) return 'Todavía no hay ninguna idea.';
    const head = `${m.count} ${m.count === 1 ? 'regalo' : 'regalos'} · ${m.bought} ${m.bought === 1 ? 'comprado' : 'comprados'}`;
    return m.budget !== null
      ? `${head} · ${eur(m.total)} de ${eur(m.budget)} de presupuesto`
      : `${head} · ${eur(m.total)} en total`;
  });

  protected readonly budgetLine = computed(() => {
    const m = this.money();
    if (m.budget === null) return `${eur(m.spent)} ya comprados de ${eur(m.total)} previstos`;
    const left = round2(m.budget - m.total);
    return left >= 0
      ? `${eur(m.total)} de ${eur(m.budget)} · quedan ${eur(left)} del presupuesto`
      : `${eur(m.total)} de ${eur(m.budget)} · os pasáis ${eur(-left)} del presupuesto`;
  });

  protected eur(n: number) {
    return eur(n);
  }

  protected share(g: PlanGift, who: 'me' | 'other') {
    const id = who === 'me' ? this.store.meId() : this.store.other()?.id;
    return eur(id ? (g.shares[id] ?? 0) : 0);
  }

  /** "Lo pagaste tú · Ángela te debe 30 €" */
  protected paidLine(g: PlanGift) {
    const me = this.store.meId();
    const other = this.store.other();
    const otherShare = other ? (g.shares[other.id] ?? 0) : 0;
    const myShare = me ? (g.shares[me] ?? 0) : 0;
    if (!g.paidBy) return 'Aún sin pagar';
    if (g.paidBy === me)
      return otherShare > 0
        ? `Lo pagaste tú · ${other?.name} te debe ${eur(otherShare)}`
        : 'Lo pagaste tú · cuentas en paz';
    return myShare > 0
      ? `Lo pagó ${other?.name ?? 'tu pareja'} · le debes ${eur(myShare)}`
      : `Lo pagó ${other?.name ?? 'tu pareja'} · cuentas en paz`;
  }

  protected async changeStatus(g: PlanGift, value: string) {
    try {
      await this.store.setStatus(g.id, value as PlanStatus);
    } catch (e) {
      this.toasts.error(errorMessage(e));
    }
  }

  protected async removeGift() {
    const g = this.toDelete();
    if (!g) return;
    this.busy.set(true);
    try {
      await this.store.deleteGift(g.id);
      this.toasts.show(`«${g.name}» borrado.`);
      this.toDelete.set(null);
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async removePerson() {
    const p = this.person();
    if (!p) return;
    this.busy.set(true);
    try {
      await this.store.deletePerson(p.id);
      this.confirmDeletePerson.set(false);
      this.toasts.show(`${p.name} ya no está en vuestra lista.`);
      void this.router.navigateByUrl('/plans');
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}

const eur = (n: number) => formatPrice(n, 'EUR');
