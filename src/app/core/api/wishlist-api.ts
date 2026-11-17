import { Signal } from '@angular/core';
import { Category } from '../models/category';
import { Gift, GiftInput } from '../models/gift';
import { Invitation } from '../models/invitation';
import {
  PlanGift,
  PlanGiftInput,
  PlanPerson,
  PlanPersonInput,
  PlanStatus,
  Planner,
} from '../models/plan';
import { Profile } from '../models/profile';
import { WishList } from '../models/wish-list';

/**
 * The one contract every screen talks to. Two implementations:
 *  - DemoApi      in-memory data for design review and UI tests (no backend).
 *  - SupabaseApi  phase 6: Supabase Auth + PostgreSQL RPCs + Storage (docs/DATABASE.md).
 *
 * Permissions are NOT enforced here. The client only asks; the database decides (RLS + RPC).
 * The demo mirrors those rules so the UI shows the same errors it will get in production.
 */
export abstract class WishlistApi {
  /** Signed-in profile, or null. `undefined` while the session is being restored. */
  abstract readonly profile: Signal<Profile | null | undefined>;
  /** True when running without a backend. */
  abstract readonly isDemo: boolean;

  // ---- auth ----
  abstract signIn(email: string, password: string): Promise<void>;
  abstract signUp(input: {
    email: string;
    password: string;
    displayName: string;
    inviteToken: string;
  }): Promise<'signed-in' | 'confirm-email'>;
  abstract checkInvitation(
    token: string,
    email?: string,
  ): Promise<'valid' | 'invalid' | 'email_mismatch'>;
  /** everywhere: also ends the sessions on every other device (lost phone, shared computer). */
  abstract signOut(everywhere?: boolean): Promise<void>;
  abstract updateDisplayName(name: string): Promise<void>;
  abstract requestPasswordReset(email: string): Promise<void>;
  /** Signs in from the recovery email's one-time token (works on any device). False if invalid or expired. */
  abstract verifyRecovery(tokenHash: string): Promise<boolean>;
  /** Sets a new password for the signed-in user (also used after a recovery link). */
  abstract updatePassword(password: string): Promise<void>;

  // ---- catalogue (authenticated) ----
  /** Everyone with a list of their own, owner first. */
  abstract listWishLists(): Promise<WishList[]>;
  abstract listCategories(): Promise<Category[]>;
  abstract listGifts(): Promise<Gift[]>;
  abstract getGift(id: string): Promise<Gift | null>;
  /** Live reservation status: called with (giftId, isReserved). Returns an unsubscribe. */
  abstract watchStatus(cb: (giftId: string, isReserved: boolean) => void): () => void;

  // ---- reservations (anyone, never on their own gifts) ----
  abstract reserve(giftId: string): Promise<void>;
  abstract cancelReservation(giftId: string): Promise<void>;
  abstract myReservations(): Promise<string[]>;

  // ---- people with a list: their OWN gifts only (the gift is always for the caller) ----
  abstract createGift(input: GiftInput, image: Blob[] | null): Promise<Gift>;
  abstract updateGift(id: string, input: GiftInput, image: Blob[] | null | 'remove'): Promise<Gift>;
  abstract deleteGift(id: string): Promise<void>;

  // ---- owner (administration) ----
  /** Never on the owner's own gifts: that would reveal the surprise. */
  abstract releaseGift(id: string): Promise<void>;
  abstract saveCategory(c: { id?: string; name: string }): Promise<Category>;
  abstract deleteCategory(id: string): Promise<void>;
  abstract reorderCategories(ids: string[]): Promise<void>;
  abstract listInvitations(): Promise<Invitation[]>;
  /** Returns the plain token exactly once; only its hash is stored. */
  abstract createInvitation(
    email: string | null,
    days: number,
    withList?: boolean,
  ): Promise<string>;
  abstract revokeInvitation(id: string): Promise<void>;
  abstract listFamily(): Promise<Profile[]>;
  abstract removeFamilyMember(id: string): Promise<void>;

  // ---- "Nuestros regalos": planners only (profile.isPlanner; RLS refuses everyone else) ----
  /** The people who split the presents (Cristian and Ángela), in a stable order. */
  abstract listPlanners(): Promise<Planner[]>;
  abstract listPlanPeople(): Promise<PlanPerson[]>;
  abstract savePlanPerson(id: string | null, input: PlanPersonInput): Promise<PlanPerson>;
  /** Also deletes that person's planned gifts (and their photos). */
  abstract deletePlanPerson(id: string): Promise<void>;
  abstract listPlanGifts(): Promise<PlanGift[]>;
  /**
   * Creates (id null) or updates a planned gift. Shares must add up to the price
   * (PLAN_SHARES_MISMATCH). Photo: Blob[] = new one, 'remove', null = unchanged. All or nothing:
   * if the photo fails, a new gift is not kept.
   */
  abstract savePlanGift(
    id: string | null,
    input: PlanGiftInput,
    image: Blob[] | null | 'remove',
  ): Promise<PlanGift>;
  abstract setPlanGiftStatus(id: string, status: PlanStatus): Promise<void>;
  abstract deletePlanGift(id: string): Promise<void>;
}
