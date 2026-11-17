import { TestBed } from '@angular/core/testing';
import { ANGELA, FakePlansApi, provideFakePlansApi } from '../fake-plans-api';
import { PlansStore } from '../plans-store';
import { PlanGiftForm } from './plan-gift-form';

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function setup() {
  const fake = new FakePlansApi();
  TestBed.configureTestingModule({ providers: [provideFakePlansApi(fake)] });
  const store = TestBed.inject(PlansStore);
  TestBed.tick();
  await store.load();
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
  const blur = async (id: string) => {
    el.querySelector<HTMLInputElement>(`#${id}`)!.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  };
  const choose = async (name: string, value: string) => {
    el.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)!.click();
    await fixture.whenStable();
  };
  /** [what you put, what Ángela puts], as the two boxes show them. */
  const amounts = () => [
    el.querySelector<HTMLInputElement>('#pgf-mine')!.value,
    el.querySelector<HTMLInputElement>('#pgf-other')!.value,
  ];
  const submit = async () => {
    el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };
  return { fake, el, type, blur, choose, amounts, submit };
}

describe('PlanGiftForm: how much each one puts in', () => {
  it('splits in half by default, and "Todo yo" / "Todo Ángela" move the whole price', async () => {
    const { type, choose, amounts } = await setup();
    await type('pgf-price', '85');
    expect(amounts()).toEqual(['42,5', '42,5']);
    await choose('pgf-preset', 'me');
    expect(amounts()).toEqual(['85', '0']);
    await choose('pgf-preset', 'other');
    expect(amounts()).toEqual(['0', '85']);
  });

  it('typing what Ángela puts (30 €) leaves you the rest (55 €), and the other way round', async () => {
    const { type, blur, amounts } = await setup();
    await type('pgf-price', '85');
    await type('pgf-other', '30');
    await blur('pgf-other');
    expect(amounts()).toEqual(['55', '30']);
    await type('pgf-mine', '60');
    await blur('pgf-mine');
    expect(amounts()).toEqual(['60', '25']);
  });

  it('a typed split keeps your part when the price changes', async () => {
    const { type, blur, amounts } = await setup();
    await type('pgf-price', '80');
    await type('pgf-mine', '50');
    await blur('pgf-mine');
    await type('pgf-price', '100');
    expect(amounts()).toEqual(['50', '50']);
    await type('pgf-price', '30');
    expect(amounts()).toEqual(['30', '0']);
  });

  it('refuses to save when someone puts more than the price', async () => {
    const { el, fake, type, submit } = await setup();
    await type('pgf-name', 'Camiseta de la Real Sociedad');
    await type('pgf-price', '85');
    await type('pgf-other', '90');
    await submit();
    expect(fake.saved).toHaveLength(0);
    expect(text(el.querySelector('#pgf-other-msg'))).toBe('No puedes poner más que el precio.');
  });

  it('who paid is only asked once it is bought, and defaults to you', async () => {
    const { el, choose } = await setup();
    const payers = () => el.querySelector('fieldset[disabled] input[name="pgf-paid"]');
    expect(payers()).not.toBeNull();
    await choose('pgf-status', 'bought');
    expect(payers()).toBeNull();
    expect(el.querySelector<HTMLInputElement>('input[name="pgf-paid"][value="me"]')!.checked).toBe(
      true,
    );
  });

  it('saves for whom, the shares and who paid', async () => {
    const { fake, type, blur, choose, submit } = await setup();
    await type('pgf-name', 'Camiseta de la Real Sociedad');
    await type('pgf-price', '85');
    await type('pgf-other', '30');
    await blur('pgf-other');
    await choose('pgf-status', 'bought');
    await choose('pgf-paid', 'me');
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
