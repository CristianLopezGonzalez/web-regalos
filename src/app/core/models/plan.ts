import { Currency, GiftImage } from './gift';

/*
  "Nuestros regalos": what the planners (Cristian and Ángela) are going to GIVE the family.
  Nobody else can read any of it (RLS: profiles.is_planner).
*/

export type PlanStatus = 'idea' | 'bought' | 'wrapped';

export const PLAN_STATUSES: PlanStatus[] = ['idea', 'bought', 'wrapped'];
export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  idea: 'Idea',
  bought: 'Comprado',
  wrapped: 'Envuelto',
};

/** One of the two people who plan (and pay for) the presents. */
export interface Planner {
  id: string;
  name: string;
}

/** Someone we give presents to. A free name: they may not have an account. */
export interface PlanPerson {
  id: string;
  name: string;
  /** Optional budget for this person, in EUR. */
  budget: number | null;
  createdAt: string;
}

/** Planner id → amount they put into the gift. Adds up to the price. */
export type PlanShares = Record<string, number>;

export interface PlanGift {
  id: string;
  personId: string;
  name: string;
  price: number;
  currency: Currency;
  purchaseUrl: string | null;
  note: string;
  image: GiftImage | null;
  status: PlanStatus;
  shares: PlanShares;
  /** Who paid at the shop; null = nobody yet. */
  paidBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanPersonInput {
  name: string;
  budget: number | null;
}

export interface PlanGiftInput {
  personId: string;
  name: string;
  price: number;
  currency: Currency;
  purchaseUrl: string | null;
  note: string;
  status: PlanStatus;
  shares: PlanShares;
  paidBy: string | null;
}
