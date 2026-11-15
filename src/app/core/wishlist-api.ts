import { Signal } from '@angular/core';
import { Category, Gift, GiftInput, Invitation, Profile } from './models';

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
  abstract signUp(input: { email: string; password: string; displayName: string; inviteToken: string }): Promise<'signed-in' | 'confirm-email'>;
  abstract checkInvitation(token: string, email?: string): Promise<'valid' | 'invalid' | 'email_mismatch'>;
  abstract signOut(): Promise<void>;
  abstract updateDisplayName(name: string): Promise<void>;
  abstract requestPasswordReset(email: string): Promise<void>;
  /** Signs in from the recovery email's one-time token (works on any device). False if invalid or expired. */
  abstract verifyRecovery(tokenHash: string): Promise<boolean>;
  /** Sets a new password for the signed-in user (also used after a recovery link). */
  abstract updatePassword(password: string): Promise<void>;

  // ---- catalogue (authenticated) ----
  abstract listCategories(): Promise<Category[]>;
  abstract listGifts(): Promise<Gift[]>;
  abstract getGift(id: string): Promise<Gift | null>;
  /** Live reservation status: called with (giftId, isReserved). Returns an unsubscribe. */
  abstract watchStatus(cb: (giftId: string, isReserved: boolean) => void): () => void;

  // ---- reservations (family) ----
  abstract reserve(giftId: string): Promise<void>;
  abstract cancelReservation(giftId: string): Promise<void>;
  abstract myReservations(): Promise<string[]>;

  // ---- owner ----
  abstract createGift(input: GiftInput, image: Blob[] | null): Promise<Gift>;
  abstract updateGift(id: string, input: GiftInput, image: Blob[] | null | 'remove'): Promise<Gift>;
  abstract deleteGift(id: string): Promise<void>;
  abstract releaseGift(id: string): Promise<void>;
  abstract saveCategory(c: { id?: string; name: string }): Promise<Category>;
  abstract deleteCategory(id: string): Promise<void>;
  abstract reorderCategories(ids: string[]): Promise<void>;
  abstract listInvitations(): Promise<Invitation[]>;
  /** Returns the plain token exactly once; only its hash is stored. */
  abstract createInvitation(email: string | null, days: number): Promise<string>;
  abstract revokeInvitation(id: string): Promise<void>;
  abstract listFamily(): Promise<Profile[]>;
  abstract removeFamilyMember(id: string): Promise<void>;
}
