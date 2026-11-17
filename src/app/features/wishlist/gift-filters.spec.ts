import { Gift } from '@app/core/models/gift';
import { Category } from '@app/core/models/category';
import {
  countByCategory,
  filterGifts,
  hasActiveFilters,
  parseShow,
  parseSort,
  tabCategories,
} from './gift-filters';

const gift = (id: string, over: Partial<Gift> = {}): Gift => ({
  id,
  name: id,
  description: '',
  price: 10,
  currency: 'EUR',
  image: null,
  purchaseUrl: null,
  extraUrls: [],
  categoryId: null,
  priority: 'medium',
  isFavorite: false,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  forId: 'u-owner',
  isReserved: false,
  ...over,
});

const all = { categoryId: null, show: 'todos', query: '', sort: 'prioridad' } as const;

describe('gift filters', () => {
  const gifts = [
    gift('vela', {
      name: 'Vela de higo',
      priority: 'low',
      price: 42,
      categoryId: 'c-hogar',
      isReserved: true,
    }),
    gift('reloj', { name: 'Reloj', priority: 'high', price: 189, categoryId: 'c-accesorios' }),
    gift('pluma', {
      name: 'Pluma estilográfica',
      priority: 'medium',
      price: 145,
      isFavorite: true,
    }),
  ];

  it('falls back to the defaults on unknown URL values', () => {
    expect(parseSort('lo-que-sea')).toBe('prioridad');
    expect(parseShow(undefined)).toBe('todos');
    expect(parseSort('precio-asc')).toBe('precio-asc');
  });

  it('sorts by priority, then price', () => {
    expect(filterGifts(gifts, all).map((g) => g.id)).toEqual(['reloj', 'pluma', 'vela']);
    expect(filterGifts(gifts, { ...all, sort: 'precio-asc' }).map((g) => g.id)).toEqual([
      'vela',
      'pluma',
      'reloj',
    ]);
  });

  it('filters by category, status and accent-insensitive text', () => {
    expect(filterGifts(gifts, { ...all, categoryId: 'c-hogar' }).map((g) => g.id)).toEqual([
      'vela',
    ]);
    expect(filterGifts(gifts, { ...all, show: 'disponibles' }).map((g) => g.id)).toEqual([
      'reloj',
      'pluma',
    ]);
    expect(filterGifts(gifts, { ...all, query: 'ESTILOGRAFICA' }).map((g) => g.id)).toEqual([
      'pluma',
    ]);
  });

  it('never mutates the input and counts per category', () => {
    const before = gifts.map((g) => g.id);
    filterGifts(gifts, { ...all, sort: 'precio-desc' });
    expect(gifts.map((g) => g.id)).toEqual(before);
    expect(countByCategory(gifts)).toEqual({ 'c-hogar': 1, 'c-accesorios': 1 });
  });

  it('flags anything other than the default show/sort', () => {
    expect(hasActiveFilters({ show: 'todos', sort: 'prioridad' })).toBe(false);
    expect(hasActiveFilters({ show: 'disponibles', sort: 'prioridad' })).toBe(true);
    expect(hasActiveFilters({ show: 'todos', sort: 'precio-asc' })).toBe(true);
  });

  it('hides empty category tabs, except the active one', () => {
    const cats = [
      { id: 'c-hogar', slug: 'hogar' },
      { id: 'c-libros', slug: 'libros' },
      { id: 'c-moda', slug: 'moda' },
    ] as Category[];
    const counts = countByCategory(gifts);
    expect(tabCategories(cats, counts, null).map((c) => c.slug)).toEqual(['hogar']);
    expect(tabCategories(cats, counts, 'moda').map((c) => c.slug)).toEqual(['hogar', 'moda']);
  });
});
