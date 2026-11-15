/**
 * Domain types. They mirror the Supabase schema in docs/DATABASE.md, minus anything private:
 * there is deliberately no "reservedBy" anywhere on the client.
 */
export type Role = 'owner' | 'family';
export type Priority = 'high' | 'medium' | 'low';
export type Currency = 'EUR' | 'USD' | 'GBP';

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  /** Has a wish list of their own: the owner, and anyone invited "con su propia lista" (e.g. Angela). */
  hasList: boolean;
  createdAt: string;
}

/**
 * One person's wish list. Its id IS that person's profile id (gifts.recipient_id).
 * Nobody sees which of their OWN gifts are reserved: enforced by RLS on gift_status.
 */
export interface WishList {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

/** Three sizes produced in the browser at upload time (480 / 960 / 1600 px, WebP). */
export interface GiftImage {
  sm: string;
  md: string;
  lg: string;
}

export interface Gift {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: Currency;
  image: GiftImage | null;
  purchaseUrl: string | null;
  categoryId: string | null;
  priority: Priority;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  /** Whose wish it is: the WishList (= profile) id. */
  forId: string;
  /** Public status only (gift_status.is_reserved). Never who. Always false on your own gifts. */
  isReserved: boolean;
}

export interface GiftInput {
  name: string;
  description: string;
  price: number;
  currency: Currency;
  purchaseUrl: string | null;
  categoryId: string | null;
  priority: Priority;
  isFavorite: boolean;
}

export type InvitationState = 'pending' | 'used' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  /** The account created from it gets a wish list of its own. */
  withList: boolean;
  emailRestriction: string | null;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export const invitationState = (i: Invitation, now = Date.now()): InvitationState =>
  i.revokedAt ? 'revoked' : i.usedAt ? 'used' : Date.parse(i.expiresAt) <= now ? 'expired' : 'pending';

/** Error codes raised by the database functions (docs/DATABASE.md §4) plus auth ones. */
export type ApiErrorCode =
  | 'GIFT_ALREADY_RESERVED'
  | 'NO_RESERVATION_TO_CANCEL'
  | 'ONLY_FAMILY_CAN_RESERVE'
  | 'CANNOT_RESERVE_OWN_GIFT'
  | 'GIFT_NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'EMAIL_TAKEN'
  | 'INVITATION_INVALID'
  | 'INVITATION_EMAIL_MISMATCH'
  | 'CATEGORY_NOT_EMPTY'
  | 'NETWORK'
  | 'UNKNOWN';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'Lo deseo muchísimo',
  medium: 'Me haría mucha ilusión',
  low: 'Si te apetece',
};
export const PRIORITY_RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

export const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP'];
