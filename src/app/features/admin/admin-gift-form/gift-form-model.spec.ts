import { emptyGiftForm, formToGiftInput } from './gift-form-model';

describe('gift form model', () => {
  it('trims text, turns empty strings into null and rounds the price to cents', () => {
    const input = formToGiftInput({
      ...emptyGiftForm(),
      name: '  Vela de higo ',
      description: ' ',
      price: 42.499,
      purchaseUrl: '  ',
      categoryId: '',
    });
    expect(input).toMatchObject({
      name: 'Vela de higo',
      description: '',
      price: 42.5,
      purchaseUrl: null,
      categoryId: null,
      currency: 'EUR',
      priority: 'medium',
    });
  });

  it('an empty price is stored as 0', () => {
    expect(formToGiftInput(emptyGiftForm()).price).toBe(0);
  });
});
