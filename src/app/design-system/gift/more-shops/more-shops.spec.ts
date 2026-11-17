import { shopLinks } from './more-shops';

describe('shopLinks (the shop buttons of a gift)', () => {
  it('one link keeps "Ver en la tienda"', () => {
    expect(shopLinks('https://www.jdsports.es/a')).toEqual([
      { url: 'https://www.jdsports.es/a', label: 'Ver en la tienda' },
    ]);
    expect(shopLinks(null, ['https://amazon.es/b'])[0].label).toBe('Ver en la tienda');
  });

  it('several are named after their shop, numbered when a shop repeats', () => {
    const labels = shopLinks('https://www.jdsports.es/a', [
      'https://www.amazon.es/b',
      'https://jdsports.es/c',
    ]).map((s) => s.label);
    expect(labels).toEqual(['jdsports.es · 1', 'amazon.es', 'jdsports.es · 2']);
  });

  it('no links, no buttons', () => {
    expect(shopLinks(null, [])).toEqual([]);
  });
});
