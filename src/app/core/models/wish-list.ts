/**
 * One person's wish list. Its id IS that person's profile id (gifts.recipient_id).
 * Nobody sees which of their OWN gifts are reserved: enforced by RLS on gift_status.
 */
export interface WishList {
  id: string;
  name: string;
}
