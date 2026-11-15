import { PlanGift, PlanShares } from '@app/core/models/plan';

/*
  The money side of "Nuestros regalos", as pure functions (no Angular, fully tested):
  how a price is split between the two planners, what each one puts in, and who owes whom
  once someone has paid at the shop. All amounts are rounded to the cent.
*/

/** Euros to the cent, without floating-point drift (0.1 + 0.2 → 0.3). */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const sharesTotal = (shares: PlanShares) =>
  round2(Object.values(shares).reduce((sum, v) => sum + v, 0));

/** Shares are valid when none is negative and they add up to the price (to the cent). */
export const sharesMatch = (shares: PlanShares, price: number) =>
  Object.values(shares).every((v) => v >= 0) && sharesTotal(shares) === round2(price);

export type SplitPreset = 'half' | 'me' | 'other' | 'custom';

/**
 * The quick options in the form. `me` is the signed-in planner, `other` the other one.
 * Half: an odd cent goes to `me`. Custom: `other` puts `otherAmount`, `me` puts the rest.
 */
export function splitShares(
  preset: SplitPreset,
  price: number,
  me: string,
  other: string,
  otherAmount = 0,
): PlanShares {
  const p = round2(price);
  switch (preset) {
    case 'half': {
      const theirs = Math.floor((p / 2) * 100) / 100;
      return { [other]: theirs, [me]: round2(p - theirs) };
    }
    case 'me':
      return { [other]: 0, [me]: p };
    case 'other':
      return { [other]: p, [me]: 0 };
    default: {
      const theirs = Math.min(Math.max(round2(otherAmount), 0), p);
      return { [other]: theirs, [me]: round2(p - theirs) };
    }
  }
}

/** Which quick option some saved shares correspond to (to preselect it when editing). */
export function presetOf(
  shares: PlanShares,
  price: number,
  me: string,
  other: string,
): SplitPreset {
  const mine = shares[me] ?? 0;
  const theirs = shares[other] ?? 0;
  if (round2(price) === 0) return 'half';
  if (theirs === 0 && mine === round2(price)) return 'me';
  if (mine === 0 && theirs === round2(price)) return 'other';
  const half = splitShares('half', price, me, other);
  if (half[me] === mine && half[other] === theirs) return 'half';
  return 'custom';
}

export interface MoneySummary {
  /** Sum of prices. */
  total: number;
  /** What each planner puts in (their shares). */
  puts: Record<string, number>;
  /** What each planner has paid at shops. */
  paid: Record<string, number>;
}

export function summarize(gifts: readonly PlanGift[], plannerIds: readonly string[]): MoneySummary {
  const puts: Record<string, number> = {};
  const paid: Record<string, number> = {};
  for (const id of plannerIds) {
    puts[id] = 0;
    paid[id] = 0;
  }
  let total = 0;
  for (const g of gifts) {
    total += g.price;
    for (const [id, v] of Object.entries(g.shares)) puts[id] = round2((puts[id] ?? 0) + v);
    if (g.paidBy) paid[g.paidBy] = round2((paid[g.paidBy] ?? 0) + g.price);
  }
  return { total: round2(total), puts, paid };
}

/** "Ángela te debe 25 €": who has to pay whom so that everyone has paid exactly their shares. */
export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/**
 * Only gifts someone has paid for count (a gift nobody bought yet owes nothing). For two planners
 * this is a single transfer; null when they are even.
 */
export function settle(
  gifts: readonly PlanGift[],
  plannerIds: readonly string[],
): Settlement | null {
  const balance: Record<string, number> = Object.fromEntries(plannerIds.map((id) => [id, 0]));
  for (const g of gifts) {
    if (!g.paidBy) continue;
    balance[g.paidBy] = round2((balance[g.paidBy] ?? 0) + g.price);
    for (const [id, v] of Object.entries(g.shares)) balance[id] = round2((balance[id] ?? 0) - v);
  }
  const ids = Object.keys(balance).sort((a, b) => balance[a] - balance[b]);
  const debtor = ids[0];
  const creditor = ids[ids.length - 1];
  const amount = round2(Math.min(-balance[debtor], balance[creditor]));
  return debtor && creditor && debtor !== creditor && amount >= 0.01
    ? { from: debtor, to: creditor, amount }
    : null;
}
