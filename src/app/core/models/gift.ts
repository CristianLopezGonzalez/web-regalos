/**
 * Gift domain types. They mirror the Supabase schema in docs/DATABASE.md, minus anything private:
 * there is deliberately no "reservedBy" anywhere on the client.
 */
export type Priority = 'high' | 'medium' | 'low';
export type Currency = 'EUR' | 'USD' | 'GBP';

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
  /** Up to three more shop links besides purchaseUrl. */
  extraUrls: string[];
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
  /** Up to three more shop links besides purchaseUrl. */
  extraUrls: string[];
  categoryId: string | null;
  priority: Priority;
  isFavorite: boolean;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'Lo deseo muchísimo',
  medium: 'Me haría mucha ilusión',
  low: 'Si te apetece',
};
export const PRIORITY_RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

export const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP'];
