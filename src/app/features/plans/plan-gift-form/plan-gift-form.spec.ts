import { TestBed } from '@angular/core/testing';
import { ANGELA, FakePlansApi, provideFakePlansApi } from '../fake-plans-api';
import { PlanGiftForm } from './plan-gift-form';

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function setup() {
  const fake = new FakePlansApi();
  TestBed.configureTestingModule({ providers: [provideFakePlansApi(fake)] });
  const fixture = TestBed.createComponent(PlanGiftForm);
  fixture.componentRef.setInput('personId', 'papa');
  fixture.componentRef.setInput('me', 'cristian');
  fixture.componentRef.setInput('other', ANGELA);
  await fixture.whenStable();
  const el: HTMLElement = fixture.nativeElement;
  const type = async (id: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const choose = async (name: string, value: string) => {
    el.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)!.click();
    await fixture.whenStable();
  };
  const amounts = () => [...el.querySelectorAll('.pgf-amount')].map(text);
  const submit = async () => {
    el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };
  return { fake, el, type, choose, amounts, submit };
}

describe('PlanGiftForm: how much each one puts in', () => {
  it('splits in half by default, and "Todo yo" / "Todo Ángela" move the whole price', async () => {
    const { type, choose, amounts } = await setup();
    await type('pgf-price', '85');
    expect(amounts()).toEqual(['42,50 €', '42,50 €']);
    await choose('pgf-preset', 'me');
    expect(amounts()).toEqual(['0 €', '85 €']);
    await choose('pgf-preset', 'other');
    expect(amounts()).toEqual(['85 €', '0 €']);
  });

  it('your example: Ángela puts 30 €, the rest (55 €) is computed for you', async () => {
    const { el, type, choose, amounts } = await setup();
    await type('pgf-price', '85');
    await choose('pgf-preset', 'custom');
    await type('pgf-other', '30');
    expect(amounts()).toEqual(['55 €']);
    expect(text(el.querySelector('.pgf-sum'))).toBe('30 € + 55 € = 85 €, el precio completo');
  });

  it('refuses to save when the shares cannot add up to the price', async () => {
    const { el, fake, type, choose, submit } = await setup();
    await type('pgf-name', 'Camiseta de la Real Sociedad');
    await type('pgf-price', '85');
    await choose('pgf-preset', 'custom');
    await type('pgf-other', '90');
    await submit();
    expect(fake.saved).toHaveLength(0);
    expect(text(el.querySelector('.pgf-sum'))).toContain('no suma');
    expect(text(el.querySelector('#pgf-other-msg'))).toBe(
      'Ángela no puede poner más que el precio.',
    );
  });

  it('saves the shares and who paid', async () => {
    const { fake, type, choose, submit } = await setup();
    await type('pgf-name', 'Camiseta de la Real Sociedad');
    await type('pgf-price', '85');
    await choose('pgf-preset', 'custom');
    await type('pgf-other', '30');
    await choose('pgf-paid', 'me');
    await choose('pgf-status', 'bought');
    await submit();
    expect(fake.saved).toHaveLength(1);
    expect(fake.saved[0].input).toMatchObject({
      personId: 'papa',
      name: 'Camiseta de la Real Sociedad',
      price: 85,
      shares: { angela: 30, cristian: 55 },
      paidBy: 'cristian',
      status: 'bought',
    });
  });
});
