import { PlanGift } from '@app/core/models/plan';
import { presetOf, settle, sharesMatch, splitShares, summarize } from './plan-math';

const ME = 'cristian';
const ANGELA = 'angela';

const gift = (over: Partial<PlanGift>): PlanGift => ({
  id: 'g',
  personId: 'papa',
  name: 'Regalo',
  price: 0,
  currency: 'EUR',
  purchaseUrl: null,
  extraUrls: [],
  note: '',
  image: null,
  status: 'idea',
  shares: {},
  paidBy: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('splitting a price', () => {
  it('your example: 85 €, Ángela puts 30 €, I put the rest', () => {
    expect(splitShares('custom', 85, ME, ANGELA, 30)).toEqual({ angela: 30, cristian: 55 });
  });

  it('halves, an odd cent goes to me, and the quick options', () => {
    expect(splitShares('half', 25, ME, ANGELA)).toEqual({ angela: 12.5, cristian: 12.5 });
    expect(splitShares('half', 25.01, ME, ANGELA)).toEqual({ angela: 12.5, cristian: 12.51 });
    expect(splitShares('me', 20, ME, ANGELA)).toEqual({ angela: 0, cristian: 20 });
    expect(splitShares('other', 20, ME, ANGELA)).toEqual({ angela: 20, cristian: 0 });
  });

  it('a custom amount never goes below 0 or above the price', () => {
    expect(splitShares('custom', 50, ME, ANGELA, 80)).toEqual({ angela: 50, cristian: 0 });
    expect(splitShares('custom', 50, ME, ANGELA, -5)).toEqual({ angela: 0, cristian: 50 });
  });

  it('checks that the shares add up to the price, to the cent', () => {
    expect(sharesMatch({ angela: 0.1, cristian: 0.2 }, 0.3)).toBe(true);
    expect(sharesMatch({ angela: 30, cristian: 50 }, 85)).toBe(false);
    expect(sharesMatch({ angela: -5, cristian: 90 }, 85)).toBe(false);
  });

  it('recognises the quick option of saved shares', () => {
    expect(presetOf({ angela: 30, cristian: 55 }, 85, ME, ANGELA)).toBe('custom');
    expect(presetOf({ angela: 12.5, cristian: 12.5 }, 25, ME, ANGELA)).toBe('half');
    expect(presetOf({ angela: 20, cristian: 0 }, 20, ME, ANGELA)).toBe('other');
    expect(presetOf({ angela: 0, cristian: 20 }, 20, ME, ANGELA)).toBe('me');
  });
});

describe('the accounts', () => {
  const papa = [
    // I paid the shirt: Ángela owes me her 30 €.
    gift({ price: 85, shares: { angela: 30, cristian: 55 }, paidBy: ME, status: 'bought' }),
    // Ángela paid the scarf, all of it hers: even.
    gift({ price: 20, shares: { angela: 20, cristian: 0 }, paidBy: ANGELA, status: 'wrapped' }),
    // Nobody bought the book yet: it doesn't count.
    gift({ price: 25, shares: { angela: 12.5, cristian: 12.5 } }),
  ];

  it('totals what each one puts in and has paid', () => {
    expect(summarize(papa, [ME, ANGELA])).toEqual({
      total: 130,
      puts: { cristian: 67.5, angela: 62.5 },
      paid: { cristian: 85, angela: 20 },
    });
  });

  it('says who owes whom', () => {
    expect(settle(papa, [ME, ANGELA])).toEqual({ from: ANGELA, to: ME, amount: 30 });
  });

  it('is even when each one paid exactly their part', () => {
    const even = [
      gift({ price: 40, shares: { angela: 20, cristian: 20 }, paidBy: ME }),
      gift({ price: 40, shares: { angela: 20, cristian: 20 }, paidBy: ANGELA }),
    ];
    expect(settle(even, [ME, ANGELA])).toBeNull();
    expect(settle([], [ME, ANGELA])).toBeNull();
  });
});
