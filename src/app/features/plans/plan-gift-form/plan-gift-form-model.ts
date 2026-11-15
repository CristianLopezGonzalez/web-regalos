import { Currency } from '@app/core/models/gift';
import { PlanGift, PlanGiftInput, PlanShares, PlanStatus } from '@app/core/models/plan';
import { SplitPreset, presetOf, round2, splitShares } from '../plan-math';

/** Who paid at the shop, as the form shows it (relative to the signed-in planner). */
export type PaidByChoice = 'me' | 'other' | 'none';

/** What the planned-gift form edits. `otherAmount` only matters for the "Otra cantidad" preset. */
export interface PlanGiftFormModel {
  name: string;
  price: number | null;
  currency: Currency;
  preset: SplitPreset;
  /** What the OTHER planner puts in; the signed-in planner puts the rest. */
  otherAmount: number | null;
  paidBy: PaidByChoice;
  purchaseUrl: string;
  note: string;
  status: PlanStatus;
}

export const emptyPlanGiftForm = (): PlanGiftFormModel => ({
  name: '',
  price: null,
  currency: 'EUR',
  preset: 'half',
  otherAmount: null,
  paidBy: 'none',
  purchaseUrl: '',
  note: '',
  status: 'idea',
});

export function planGiftToForm(g: PlanGift, me: string, other: string): PlanGiftFormModel {
  return {
    name: g.name,
    price: g.price,
    currency: g.currency,
    preset: presetOf(g.shares, g.price, me, other),
    otherAmount: g.shares[other] ?? 0,
    paidBy: g.paidBy === me ? 'me' : g.paidBy === other ? 'other' : 'none',
    purchaseUrl: g.purchaseUrl ?? '',
    note: g.note,
    status: g.status,
  };
}

/**
 * The shares as typed, WITHOUT clamping: with "Otra cantidad" above the price the signed-in
 * planner's part comes out negative, which sharesMatch() rejects (and the form shows why).
 */
export function formShares(v: PlanGiftFormModel, me: string, other: string): PlanShares {
  const price = round2(v.price ?? 0);
  if (v.preset !== 'custom') return splitShares(v.preset, price, me, other);
  const theirs = round2(v.otherAmount ?? 0);
  return { [other]: theirs, [me]: round2(price - theirs) };
}

export function formToPlanInput(
  v: PlanGiftFormModel,
  personId: string,
  me: string,
  other: string,
): PlanGiftInput {
  return {
    personId,
    name: v.name.trim(),
    price: round2(v.price ?? 0),
    currency: v.currency,
    purchaseUrl: v.purchaseUrl.trim() || null,
    note: v.note.trim(),
    status: v.status,
    shares: formShares(v, me, other),
    paidBy: v.paidBy === 'me' ? me : v.paidBy === 'other' ? other : null,
  };
}
