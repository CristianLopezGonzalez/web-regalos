import { Gift, PRIORITY_RANK } from '@app/core/models/gift';
import { foldAccents } from '@app/core/text/slugify';

/** Values of ?orden= and ?ver= (Spanish, because they show in the address bar). */
export type GiftSort = 'prioridad' | 'precio-asc' | 'precio-desc' | 'recientes';
export type GiftShow = 'todos' | 'disponibles' | 'reservados';

const SORTS: readonly GiftSort[] = ['prioridad', 'precio-asc', 'precio-desc', 'recientes'];
const SHOWS: readonly GiftShow[] = ['todos', 'disponibles', 'reservados'];

export const parseSort = (v: string | undefined): GiftSort =>
  SORTS.includes(v as GiftSort) ? (v as GiftSort) : 'prioridad';
export const parseShow = (v: string | undefined): GiftShow =>
  SHOWS.includes(v as GiftShow) ? (v as GiftShow) : 'todos';

const COMPARE: Record<GiftSort, (a: Gift, b: Gift) => number> = {
  prioridad: (a, b) =>
    PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
    Number(b.isFavorite) - Number(a.isFavorite),
  'precio-asc': (a, b) => a.price - b.price,
  'precio-desc': (a, b) => b.price - a.price,
  recientes: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

export interface GiftFilter {
  categoryId: string | null;
  show: GiftShow;
  /** Free text, matched without accents against name + description. */
  query: string;
  sort: GiftSort;
}

/** The gifts on screen, in order. Never mutates the input. */
export function filterGifts(gifts: readonly Gift[], f: GiftFilter): Gift[] {
  const q = foldAccents(f.query.trim());
  return gifts
    .filter(
      (g) =>
        (!f.categoryId || g.categoryId === f.categoryId) &&
        (f.show === 'todos' || (f.show === 'reservados') === g.isReserved) &&
        (!q || foldAccents(`${g.name} ${g.description}`).includes(q)),
    )
    .sort(COMPARE[f.sort]);
}

/** Gifts per category id, for the directory counts. */
export function countByCategory(gifts: readonly Gift[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of gifts) if (g.categoryId) out[g.categoryId] = (out[g.categoryId] ?? 0) + 1;
  return out;
}
