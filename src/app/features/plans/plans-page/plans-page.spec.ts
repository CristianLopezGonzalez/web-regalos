import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FakePlansApi, planGift, provideFakePlansApi } from '../fake-plans-api';
import { PlansStore } from '../plans-store';
import { PlansPage } from './plans-page';

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function render(fake = new FakePlansApi()) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideFakePlansApi(fake)],
  });
  const store = TestBed.inject(PlansStore);
  TestBed.tick();
  await store.load();
  const fixture = TestBed.createComponent(PlansPage);
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture, fake };
}

describe('Nuestros regalos: the board', () => {
  it('private to the two of us, with the accounts on top', async () => {
    const { el } = await render();
    expect(text(el.querySelector('.pb-private'))).toBe('Solo Ángela y tú');
    expect(text(el.querySelector('.pb-settle'))).toBe('Ángela te debe 30 €');
  });

  it('puts each present in the column of its status, with who puts what', async () => {
    const fake = new FakePlansApi();
    fake.gifts = [
      planGift(),
      planGift({
        id: 'g-libro',
        name: 'Libro',
        status: 'idea',
        price: 25,
        shares: { angela: 12.5, cristian: 12.5 },
        paidBy: null,
      }),
    ];
    const { el } = await render(fake);
    const cols = [...el.querySelectorAll('.pb-col')];
    expect(cols.map((c) => c.querySelectorAll('.pb-card').length)).toEqual([1, 1, 0]);
    const bought = text(cols[1].querySelector('.pb-card'));
    expect(bought).toContain('Camiseta de la Real Sociedad');
    expect(bought).toContain('Tú 55 € · Ángela 30 €');
    expect(bought).toContain('Lo pagaste tú');
  });

  it('the card button moves a present on to the next column', async () => {
    const fake = new FakePlansApi();
    fake.gifts = [planGift({ status: 'idea', paidBy: null })];
    const { el, fixture } = await render(fake);
    el.querySelector<HTMLButtonElement>('.pb-card-next')!.click();
    await fixture.whenStable();
    const cols = [...el.querySelectorAll('.pb-col')];
    expect(cols.map((c) => c.querySelectorAll('.pb-card').length)).toEqual([0, 1, 0]);
  });
});
