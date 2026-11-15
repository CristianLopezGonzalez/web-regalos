import { signal } from '@angular/core';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { PlanGift, PlanGiftInput, PlanPerson, Planner } from '@app/core/models/plan';
import { Profile } from '@app/core/models/profile';

/*
  Test double for the plans part of WishlistApi (specs only). Holds the "Real Sociedad" example:
  Papá's 85 € shirt, Ángela puts 30 €, Cristian the rest and paid it at the shop.
*/

export const CRISTIAN: Planner = { id: 'cristian', name: 'Cristian' };
export const ANGELA: Planner = { id: 'angela', name: 'Ángela' };

export const profileOf = (p: Planner): Profile => ({
  id: p.id,
  email: `${p.id}@demo.test`,
  displayName: p.name,
  role: p.id === 'cristian' ? 'owner' : 'family',
  hasList: true,
  isPlanner: true,
  createdAt: '2026-11-01T00:00:00Z',
});

export function planGift(over: Partial<PlanGift> = {}): PlanGift {
  return {
    id: 'g-camiseta',
    personId: 'papa',
    name: 'Camiseta de la Real Sociedad',
    price: 85,
    currency: 'EUR',
    purchaseUrl: null,
    note: 'Talla L',
    image: null,
    status: 'bought',
    shares: { angela: 30, cristian: 55 },
    paidBy: 'cristian',
    createdAt: '2026-11-10T00:00:00Z',
    updatedAt: '2026-11-10T00:00:00Z',
    ...over,
  };
}

export class FakePlansApi {
  readonly isDemo = true;
  readonly profile = signal<Profile | null | undefined>(profileOf(CRISTIAN));
  planners: Planner[] = [CRISTIAN, ANGELA];
  people: PlanPerson[] = [
    { id: 'papa', name: 'Papá', budget: 150, createdAt: '2026-11-01T00:00:00Z' },
  ];
  gifts: PlanGift[] = [planGift()];
  saved: { id: string | null; input: PlanGiftInput; image: unknown }[] = [];
  failStatus = false;

  async listPlanners() {
    return this.planners;
  }
  async listPlanPeople() {
    return this.people;
  }
  async listPlanGifts() {
    return this.gifts;
  }
  async savePlanPerson(id: string | null, input: { name: string; budget: number | null }) {
    const p = { id: id ?? `p${this.people.length + 1}`, createdAt: '', ...input };
    this.people = [...this.people.filter((x) => x.id !== p.id), p];
    return p;
  }
  async deletePlanPerson(id: string) {
    this.people = this.people.filter((p) => p.id !== id);
  }
  async savePlanGift(id: string | null, input: PlanGiftInput, image: unknown) {
    this.saved.push({ id, input, image });
    return planGift({ ...input, id: id ?? `g${this.saved.length}` });
  }
  async setPlanGiftStatus() {
    if (this.failStatus) throw new Error('nope');
  }
  async deletePlanGift(id: string) {
    this.gifts = this.gifts.filter((g) => g.id !== id);
  }
}

export const provideFakePlansApi = (fake: FakePlansApi) => ({
  provide: WishlistApi,
  useValue: fake as unknown as WishlistApi,
});
