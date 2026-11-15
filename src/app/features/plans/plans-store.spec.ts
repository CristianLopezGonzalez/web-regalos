import { TestBed } from '@angular/core/testing';
import { ANGELA, FakePlansApi, planGift, profileOf, provideFakePlansApi } from './fake-plans-api';
import { PlansStore } from './plans-store';

const nbsp = (s: string) => s.replace(/\s/g, ' ');

async function setup(fake = new FakePlansApi()) {
  TestBed.configureTestingModule({ providers: [provideFakePlansApi(fake)] });
  const store = TestBed.inject(PlansStore);
  TestBed.tick(); // runs the profile effect, which starts loading
  await store.load();
  return { store, fake };
}

describe('PlansStore', () => {
  it('loads for a planner and words the accounts from their side', async () => {
    const { store } = await setup();
    expect(store.loaded()).toBe(true);
    expect(store.other()?.name).toBe('Ángela');
    expect(nbsp(store.settlementText())).toBe('Ángela te debe 30 €');
    expect(store.summary().puts).toEqual({ cristian: 55, angela: 30 });
  });

  it('says it the other way round for Ángela', async () => {
    const fake = new FakePlansApi();
    fake.profile.set(profileOf(ANGELA));
    const { store } = await setup(fake);
    expect(nbsp(store.settlementText())).toBe('Le debes 30 € a Cristian');
    expect(store.nameOf('angela')).toBe('Tú');
  });

  it('is even when nobody owes anything', async () => {
    const fake = new FakePlansApi();
    fake.gifts = [planGift({ paidBy: null, status: 'idea' })];
    const { store } = await setup(fake);
    expect(store.settlementText()).toBe('Estáis en paz');
  });

  it('does not load anything for someone who is not a planner', async () => {
    const fake = new FakePlansApi();
    fake.profile.set({ ...profileOf(ANGELA), isPlanner: false });
    TestBed.configureTestingModule({ providers: [provideFakePlansApi(fake)] });
    const store = TestBed.inject(PlansStore);
    TestBed.tick();
    expect(store.loaded()).toBe(false);
  });

  it('changes a status at once and puts it back if the database refuses', async () => {
    const { store, fake } = await setup();
    await store.setStatus('g-camiseta', 'wrapped');
    expect(store.gift('g-camiseta')?.status).toBe('wrapped');
    fake.failStatus = true;
    await expect(store.setStatus('g-camiseta', 'idea')).rejects.toBeTruthy();
    expect(store.gift('g-camiseta')?.status).toBe('wrapped');
  });

  it('deleting a person drops their gifts too', async () => {
    const { store } = await setup();
    await store.deletePerson('papa');
    expect(store.people()).toEqual([]);
    expect(store.gifts()).toEqual([]);
  });
});
