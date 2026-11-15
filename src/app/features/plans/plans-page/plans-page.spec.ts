import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FakePlansApi, provideFakePlansApi } from '../fake-plans-api';
import { PlanPersonPage } from '../plan-person-page/plan-person-page';
import { PlansStore } from '../plans-store';
import { PlansPage } from './plans-page';

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function render<T>(component: Type<T>, inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideFakePlansApi(new FakePlansApi())],
  });
  const store = TestBed.inject(PlansStore);
  TestBed.tick();
  await store.load();
  const fixture = TestBed.createComponent(component);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('Nuestros regalos pages', () => {
  it('overview: private to the two of us, accounts and one card per person', async () => {
    const el = await render(PlansPage);
    expect(text(el.querySelector('.pl-private'))).toBe('Solo Ángela y tú');
    expect(text(el.querySelector('.pl-settle'))).toBe('Ángela te debe 30 €');
    const card = text(el.querySelector('.pl-card'));
    expect(card).toContain('Papá');
    expect(card).toContain('85 € / 150 €');
    expect(card).toContain('Tú 55 € · Ángela 30 €');
  });

  it('person page: who puts what and who paid, per gift', async () => {
    const el = await render(PlanPersonPage, { personId: 'papa' });
    expect(text(el.querySelector('h1'))).toBe('Papá');
    const row = text(el.querySelector('.pp-row'));
    expect(row).toContain('Camiseta de la Real Sociedad');
    expect(row).toContain('Ángela: 30 €');
    expect(row).toContain('Tú: 55 €');
    expect(row).toContain('Lo pagaste tú · Ángela te debe 30 €');
  });

  it('person page: an unknown person is "No encontrado"', async () => {
    const el = await render(PlanPersonPage, { personId: 'nadie' });
    expect(text(el.querySelector('h1'))).toBe('No encontrado');
  });
});
