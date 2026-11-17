import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { errorMessage } from '@app/core/api/error-message';
import { formatPrice } from '@app/core/format/price-format';
import { PLAN_STATUSES, PlanGift, PlanPerson, PlanStatus } from '@app/core/models/plan';
import { Toasts } from '@app/core/toast/toasts';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { ProductImage } from '@app/design-system/gift/product-image/product-image';
import { PlanGiftDetail } from '../plan-gift-detail/plan-gift-detail';
import { PlanGiftForm } from '../plan-gift-form/plan-gift-form';
import { PlanPersonDialog } from '../plan-person-dialog/plan-person-dialog';
import { round2 } from '../plan-math';
import { PlansStore } from '../plans-store';

const COLUMNS: { status: PlanStatus; title: string }[] = [
  { status: 'idea', title: 'Ideas' },
  { status: 'bought', title: 'Comprados' },
  { status: 'wrapped', title: 'Envueltos' },
];
const NEXT: Partial<Record<PlanStatus, { status: PlanStatus; label: string }>> = {
  idea: { status: 'bought', label: 'Comprado' },
  bought: { status: 'wrapped', label: 'Envuelto' },
};

/** Which dialog is open over the board. */
type Dialog =
  | { kind: 'none' }
  | { kind: 'new' }
  | { kind: 'detail'; giftId: string }
  | { kind: 'edit'; giftId: string }
  | { kind: 'accounts' };

/**
 * /plans?persona=: "Nuestros regalos" as a board. Three columns (Ideas, Comprados, Envueltos);
 * a card moves on with its button, opens its detail when pressed. Adding a present, a person
 * and the detail are dialogs over the board (sheets on phones, where the columns become tabs).
 * Only the two planners ever get here (guard + RLS).
 */
@Component({
  selector: 'app-plans-page',
  imports: [Modal, ProductImage, PlanGiftForm, PlanGiftDetail, PlanPersonDialog],
  templateUrl: './plans-page.html',
  styleUrl: './plans-page.css',
})
export class PlansPage {
  protected readonly store = inject(PlansStore);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  /** ?persona= : only that person's presents. */
  readonly persona = input<string | undefined>();

  protected readonly errorText = computed(() => errorMessage(this.store.error()));
  protected readonly otherName = computed(() => this.store.other()?.name ?? 'tu pareja');

  // ---------------------------------------------------------------- filter + tabs
  protected readonly filter = computed(() => this.store.person(this.persona())?.id ?? null);
  protected readonly filterPerson = computed(() => this.store.person(this.filter()));
  /** Phones: which column is showing. */
  protected readonly tab = signal<PlanStatus>('idea');

  protected readonly chips = computed(() => {
    const gifts = this.store.gifts() ?? [];
    return [
      { id: null as string | null, label: 'Todos', count: gifts.length },
      ...(this.store.people() ?? []).map((p) => ({
        id: p.id as string | null,
        label: p.name,
        count: gifts.filter((g) => g.personId === p.id).length,
      })),
    ];
  });

  private readonly shown = computed(() =>
    (this.store.gifts() ?? []).filter((g) => !this.filter() || g.personId === this.filter()),
  );

  protected readonly columns = computed(() =>
    COLUMNS.map((c) => ({
      ...c,
      cards: this.shown()
        .filter((g) => g.status === c.status)
        .map((g) => this.card(g)),
    })),
  );

  // ---------------------------------------------------------------- summary
  protected readonly spentPct = computed(() => {
    const s = this.store.stats();
    return s.budgets > 0 ? Math.min(100, Math.round((s.spent / s.budgets) * 100)) : 0;
  });
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

  // ---------------------------------------------------------------- dialogs
  protected readonly dialog = signal<Dialog>({ kind: 'none' });
  protected readonly personOpen = signal(false);
  protected readonly personEditing = signal<PlanPerson | null>(null);

  protected readonly dialogGift = computed(() => {
    const d = this.dialog();
    return d.kind === 'detail' || d.kind === 'edit' ? this.store.gift(d.giftId) : null;
  });
  protected readonly lastGiftName = signal('');

  protected open(kind: 'new' | 'accounts') {
    this.dialog.set({ kind });
  }
  protected openDetail(id: string) {
    this.lastGiftName.set(this.store.gift(id)?.name ?? '');
    this.dialog.set({ kind: 'detail', giftId: id });
  }
  protected openEdit() {
    const d = this.dialog();
    if (d.kind === 'detail') this.dialog.set({ kind: 'edit', giftId: d.giftId });
  }
  protected closeDialog() {
    this.dialog.set({ kind: 'none' });
  }
  protected isOpen(kind: Dialog['kind']) {
    return this.dialog().kind === kind;
  }

  protected addPerson() {
    this.personEditing.set(null);
    this.personOpen.set(true);
  }
  protected editPerson() {
    this.personEditing.set(this.filterPerson());
    this.personOpen.set(true);
  }
  protected onPersonSaved(p: PlanPerson) {
    this.toasts.success(
      this.personEditing() ? 'Cambios guardados.' : `${p.name} ya está en la lista.`,
    );
    if (!this.personEditing()) this.setFilter(p.id);
  }
  protected onPersonDeleted() {
    this.setFilter(null);
  }

  protected onSaved(g: PlanGift) {
    const isNew = this.isOpen('new');
    this.toasts.success(isNew ? 'Regalo añadido.' : 'Cambios guardados.');
    this.tab.set(g.status);
    this.dialog.set(isNew ? { kind: 'none' } : { kind: 'detail', giftId: g.id });
  }

  protected setFilter(id: string | null) {
    void this.router.navigate([], {
      queryParams: { persona: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** The card's button: on to the next column. */
  protected async advance(id: string) {
    const g = this.store.gift(id);
    const next = g ? NEXT[g.status] : undefined;
    if (!g || !next) return;
    try {
      await this.store.setStatus(id, next.status);
    } catch (e) {
      this.toasts.error(errorMessage(e));
    }
  }

  protected money(n: number) {
    return formatPrice(n, 'EUR');
  }

  private card(g: PlanGift) {
    const me = this.store.meId() ?? '';
    const other = this.store.other();
    const mine = g.shares[me] ?? 0;
    const theirs = g.shares[other?.id ?? ''] ?? 0;
    const person = this.store.person(g.personId);
    const price = (n: number) => formatPrice(round2(n), g.currency);
    return {
      id: g.id,
      name: g.name,
      image: g.image,
      person: person?.name ?? '',
      initial: initialOf(person?.name ?? ''),
      price: price(g.price),
      split:
        mine && theirs
          ? `Tú ${price(mine)} · ${other?.name ?? ''} ${price(theirs)}`
          : mine
            ? 'Lo pones tú entero'
            : `Lo pone ${other?.name ?? ''} entero`,
      paid: !g.paidBy
        ? 'Sin pagar'
        : g.paidBy === me
          ? 'Lo pagaste tú'
          : `Lo pagó ${other?.name ?? ''}`,
      next: NEXT[g.status] ?? null,
    };
  }

  protected readonly statuses = PLAN_STATUSES;
}

export const initialOf = (name: string) => name.trim().charAt(0).toLocaleUpperCase('es') || '·';
