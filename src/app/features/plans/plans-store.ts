import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { formatPrice } from '@app/core/format/price-format';
import {
  PlanGift,
  PlanGiftInput,
  PlanPerson,
  PlanPersonInput,
  PlanStatus,
  Planner,
} from '@app/core/models/plan';
import { MoneySummary, Settlement, round2, settle, summarize } from './plan-math';

/**
 * In-memory state of "Nuestros regalos" for the signed-in planner: the two planners, the people
 * we give to and the presents planned for them. Loads only for planners (the database refuses
 * everyone else anyway) and drops everything when the person signs out.
 */
@Injectable({ providedIn: 'root' })
export class PlansStore {
  private readonly api = inject(WishlistApi);

  readonly planners = signal<Planner[]>([]);
  readonly people = signal<PlanPerson[] | null>(null);
  readonly gifts = signal<PlanGift[] | null>(null);
  readonly error = signal<unknown>(null);

  readonly loaded = computed(() => this.people() !== null && this.gifts() !== null);
  readonly meId = computed(() => this.api.profile()?.id ?? null);
  /** The other planner (Ángela for Cristian, Cristian for Ángela). */
  readonly other = computed(() => this.planners().find((p) => p.id !== this.meId()) ?? null);
  readonly plannerIds = computed(() => this.planners().map((p) => p.id));

  readonly summary = computed<MoneySummary>(() => summarize(this.gifts() ?? [], this.plannerIds()));
  readonly settlement = computed<Settlement | null>(() =>
    settle(this.gifts() ?? [], this.plannerIds()),
  );
  /** "Ángela te debe 25 €" / "Le debes 25 € a Ángela" / "Estáis en paz". */
  readonly settlementText = computed(() => {
    const s = this.settlement();
    if (!s) return 'Estáis en paz';
    const amount = formatPrice(s.amount, 'EUR');
    return s.to === this.meId()
      ? `${this.nameOf(s.from)} te debe ${amount}`
      : `Le debes ${amount} a ${this.nameOf(s.to)}`;
  });
  readonly stats = computed(() => {
    const gifts = this.gifts() ?? [];
    const bought = gifts.filter((g) => g.status !== 'idea');
    const budgets = (this.people() ?? []).reduce((sum, p) => sum + (p.budget ?? 0), 0);
    return {
      people: this.people()?.length ?? 0,
      ideas: gifts.length,
      bought: bought.length,
      wrapped: gifts.filter((g) => g.status === 'wrapped').length,
      spent: round2(bought.reduce((sum, g) => sum + g.price, 0)),
      budgets: round2(budgets),
    };
  });

  private loading: Promise<void> | null = null;

  constructor() {
    // Reload whenever the signed-in person changes; drop everything on sign-out.
    effect(() => {
      const p = this.api.profile();
      untracked(() => {
        this.reset();
        if (p?.isPlanner) void this.load();
      });
    });
  }

  private reset() {
    this.loading = null;
    this.planners.set([]);
    this.people.set(null);
    this.gifts.set(null);
    this.error.set(null);
  }

  load(force = false): Promise<void> {
    if (this.loading && !force) return this.loading;
    this.error.set(null);
    this.loading = (async () => {
      try {
        const [planners, people, gifts] = await Promise.all([
          this.api.listPlanners(),
          this.api.listPlanPeople(),
          this.api.listPlanGifts(),
        ]);
        this.planners.set(planners);
        this.people.set(people);
        this.gifts.set(gifts);
      } catch (e) {
        this.error.set(e);
        this.loading = null;
      }
    })();
    return this.loading;
  }

  // ---------------------------------------------------------------- lookups
  /** "Tú" for the signed-in planner, the name for the other one. */
  nameOf(plannerId: string | null | undefined) {
    if (!plannerId) return '';
    if (plannerId === this.meId()) return 'Tú';
    return this.planners().find((p) => p.id === plannerId)?.name ?? '';
  }

  person(id: string | null | undefined) {
    return id ? (this.people()?.find((p) => p.id === id) ?? null) : null;
  }

  gift(id: string | null | undefined) {
    return id ? (this.gifts()?.find((g) => g.id === id) ?? null) : null;
  }

  giftsFor(personId: string) {
    return (this.gifts() ?? []).filter((g) => g.personId === personId);
  }

  summaryFor(personId: string): MoneySummary {
    return summarize(this.giftsFor(personId), this.plannerIds());
  }

  // ---------------------------------------------------------------- writes
  async savePerson(id: string | null, input: PlanPersonInput) {
    const saved = await this.api.savePlanPerson(id, input);
    this.people.update((l) =>
      l
        ? l.some((p) => p.id === saved.id)
          ? l.map((p) => (p.id === saved.id ? saved : p))
          : [...l, saved]
        : l,
    );
    return saved;
  }

  async deletePerson(id: string) {
    await this.api.deletePlanPerson(id);
    this.people.update((l) => l?.filter((p) => p.id !== id) ?? l);
    this.gifts.update((l) => l?.filter((g) => g.personId !== id) ?? l);
  }

  async saveGift(id: string | null, input: PlanGiftInput, image: Blob[] | null | 'remove') {
    const saved = await this.api.savePlanGift(id, input, image);
    this.upsertGift(saved);
    return saved;
  }

  /** Optimistic: the select changes at once and goes back if the database refuses. */
  async setStatus(id: string, status: PlanStatus) {
    const before = this.gift(id);
    if (!before || before.status === status) return;
    this.upsertGift({ ...before, status });
    try {
      await this.api.setPlanGiftStatus(id, status);
    } catch (e) {
      this.upsertGift(before);
      throw e;
    }
  }

  async deleteGift(id: string) {
    await this.api.deletePlanGift(id);
    this.gifts.update((l) => l?.filter((g) => g.id !== id) ?? l);
  }

  private upsertGift(g: PlanGift) {
    this.gifts.update((l) =>
      l ? (l.some((x) => x.id === g.id) ? l.map((x) => (x.id === g.id ? g : x)) : [...l, g]) : l,
    );
  }
}
