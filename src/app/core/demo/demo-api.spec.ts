import { TestBed } from '@angular/core/testing';
import { PlanGiftInput } from '../models/plan';
import { DemoApi } from './demo-api';

describe('two wish lists: the surprise rules (demo backend mirrors the database)', () => {
  const signedInAs = async (email: string) => {
    localStorage.clear();
    sessionStorage.clear();
    const api = TestBed.runInInjectionContext(() => new DemoApi());
    await api.signIn(email, 'navidad');
    return api;
  };

  it('Angela never sees which of her own gifts are reserved, but sees the others', async () => {
    const api = await signedInAs('angela@demo.test');
    const gifts = await api.listGifts();
    const me = api.profile()!.id;
    // In the seed, two of Angela's gifts are reserved (tetera by Mamá, bufanda by Cristian).
    expect(gifts.filter((g) => g.forId === me).some((g) => g.isReserved)).toBe(false);
    expect(gifts.filter((g) => g.forId !== me).some((g) => g.isReserved)).toBe(true);
  }, 20000);

  it('nobody can reserve their own wish, and trying reveals nothing', async () => {
    const api = await signedInAs('angela@demo.test');
    // g-tetera is Angela's AND already reserved: the answer must not be "already reserved".
    await expect(api.reserve('g-tetera')).rejects.toMatchObject({
      code: 'CANNOT_RESERVE_OWN_GIFT',
    });
  }, 20000);

  it('Angela can only edit her own gifts', async () => {
    const api = await signedInAs('angela@demo.test');
    const g = (await api.listGifts()).find((x) => x.id === 'g-reloj')!; // Cristian's
    await expect(api.deleteGift(g.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  }, 20000);

  it('lists are the owner first, then Angela', async () => {
    const api = await signedInAs('mama@demo.test');
    expect((await api.listWishLists()).map((l) => l.name)).toEqual(['Cristian', 'Angela']);
  }, 20000);

  it('removing someone keeps their reservations, so nobody learns what they held', async () => {
    const api = await signedInAs('yo@demo.test');
    const mama = (await api.listFamily()).find((p) => p.displayName === 'Mamá')!;
    // In the seed, Mamá reserved Angela's tetera.
    expect((await api.listGifts()).find((g) => g.id === 'g-tetera')?.isReserved).toBe(true);
    await api.removeFamilyMember(mama.id);
    expect((await api.listGifts()).find((g) => g.id === 'g-tetera')?.isReserved).toBe(true);
  }, 20000);
});

describe('"Nuestros regalos": only the two planners (demo mirrors the plan_* policies)', () => {
  const fresh = () => {
    localStorage.clear();
    sessionStorage.clear();
  };
  const as = async (email: string) => {
    const api = TestBed.runInInjectionContext(() => new DemoApi());
    await api.signIn(email, 'navidad');
    return api;
  };
  const input = (over: Partial<PlanGiftInput> = {}): PlanGiftInput => ({
    personId: 'p-papa',
    name: 'Camiseta de la Real Sociedad',
    price: 85,
    currency: 'EUR',
    purchaseUrl: null,
    extraUrls: [],
    note: '',
    status: 'idea',
    shares: { 'u-partner': 30, 'u-owner': 55 },
    paidBy: null,
    ...over,
  });

  it('a planner sees both planners, the seed example and can add, edit and delete', async () => {
    fresh();
    const api = await as('angela@demo.test');
    expect(api.profile()?.isPlanner).toBe(true);
    expect((await api.listPlanners()).map((p) => p.name)).toEqual(['Cristian', 'Angela']);
    expect((await api.listPlanPeople()).map((p) => p.name)).toEqual(['Papá', 'Mamá', 'Abuela']);
    const shirt = (await api.listPlanGifts()).find((g) => g.id === 'pg-camiseta')!;
    expect(shirt).toMatchObject({
      price: 85,
      shares: { 'u-partner': 30, 'u-owner': 55 },
      paidBy: 'u-owner',
    });

    const tio = await api.savePlanPerson(null, { name: '  Tío Javier ', budget: 40 });
    expect(tio.name).toBe('Tío Javier');
    const g = await api.savePlanGift(
      null,
      input({ personId: tio.id, price: 40, shares: { 'u-owner': 40 } }),
      null,
    );
    await api.savePlanGift(
      g.id,
      input({ personId: tio.id, price: 35, shares: { 'u-owner': 35 } }),
      null,
    );
    await api.setPlanGiftStatus(g.id, 'wrapped');
    const saved = (await api.listPlanGifts()).find((x) => x.id === g.id)!;
    expect(saved).toMatchObject({ price: 35, status: 'wrapped' });
    await api.deletePlanGift(g.id);
    expect((await api.listPlanGifts()).some((x) => x.id === g.id)).toBe(false);
  }, 30000);

  it('a family member is refused every plan call', async () => {
    fresh();
    const api = await as('mama@demo.test');
    expect(api.profile()?.isPlanner).toBe(false);
    const calls: (() => Promise<unknown>)[] = [
      () => api.listPlanners(),
      () => api.listPlanPeople(),
      () => api.savePlanPerson(null, { name: 'Yo', budget: null }),
      () => api.deletePlanPerson('p-papa'),
      () => api.listPlanGifts(),
      () => api.savePlanGift(null, input(), null),
      () => api.setPlanGiftStatus('pg-camiseta', 'idea'),
      () => api.deletePlanGift('pg-camiseta'),
    ];
    for (const call of calls) await expect(call()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  }, 30000);

  it('shares must belong to planners and add up to the price', async () => {
    fresh();
    const api = await as('yo@demo.test');
    await expect(
      api.savePlanGift(null, input({ shares: { 'u-partner': 30, 'u-owner': 50 } }), null),
    ).rejects.toMatchObject({ code: 'PLAN_SHARES_MISMATCH' });
    await expect(
      api.savePlanGift(null, input({ shares: { 'u-family': 30, 'u-owner': 55 } }), null),
    ).rejects.toMatchObject({ code: 'PLAN_SHARES_INVALID' });
    await expect(api.savePlanGift(null, input({ paidBy: 'u-family' }), null)).rejects.toMatchObject(
      { code: 'PLAN_SHARES_INVALID' },
    );
    // To the cent: 0.1 + 0.2 is 0.3 here, not 0.30000000000000004.
    await expect(
      api.savePlanGift(
        null,
        input({ price: 0.3, shares: { 'u-partner': 0.1, 'u-owner': 0.2 } }),
        null,
      ),
    ).resolves.toMatchObject({ price: 0.3 });
  }, 30000);

  it('deleting a person deletes their planned gifts', async () => {
    fresh();
    const api = await as('yo@demo.test');
    await api.deletePlanPerson('p-papa');
    expect((await api.listPlanPeople()).some((p) => p.id === 'p-papa')).toBe(false);
    expect((await api.listPlanGifts()).some((g) => g.personId === 'p-papa')).toBe(false);
  }, 30000);

  it('a demo saved before plans existed is upgraded, keeping what was there', async () => {
    fresh();
    await as('yo@demo.test'); // seeds the current state
    const key = 'mcw-demo-data-v2';
    const old = JSON.parse(localStorage.getItem(key)!);
    delete old.planPeople;
    delete old.planGifts;
    for (const u of old.users) delete u.isPlanner;
    old.categories.push({ id: 'c-mia', name: 'Mía', slug: 'mia', sortOrder: 9 });
    localStorage.setItem(key, JSON.stringify(old));
    sessionStorage.clear();

    const api = await as('angela@demo.test');
    expect(api.profile()?.isPlanner).toBe(true);
    expect((await api.listPlanGifts()).length).toBeGreaterThan(0);
    expect((await api.listCategories()).some((c) => c.id === 'c-mia')).toBe(true);
    const mama = await as('mama@demo.test');
    expect(mama.profile()?.isPlanner).toBe(false);
  }, 30000);
});
