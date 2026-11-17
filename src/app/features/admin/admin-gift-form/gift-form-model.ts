import { Currency, Gift, GiftInput, Priority } from '@app/core/models/gift';

/** Trimmed, without empty rows. */
export const cleanUrls = (urls: string[]) => urls.map((u) => u.trim()).filter(Boolean);

/** What the gift form edits: strings for the text inputs and selects, null for an empty price. */
export interface GiftFormModel {
  name: string;
  description: string;
  price: number | null;
  currency: Currency;
  purchaseUrl: string;
  /** The extra links as typed (empty rows are dropped on save). */
  extraUrls: string[];
  /** '' = no category (the first <option>). */
  categoryId: string;
  priority: Priority;
  isFavorite: boolean;
}

export const emptyGiftForm = (): GiftFormModel => ({
  name: '',
  description: '',
  price: null,
  currency: 'EUR',
  purchaseUrl: '',
  extraUrls: [],
  categoryId: '',
  priority: 'medium',
  isFavorite: false,
});

export const giftToForm = (g: Gift): GiftFormModel => ({
  name: g.name,
  description: g.description,
  price: g.price,
  currency: g.currency,
  purchaseUrl: g.purchaseUrl ?? '',
  extraUrls: [...g.extraUrls],
  categoryId: g.categoryId ?? '',
  priority: g.priority,
  isFavorite: g.isFavorite,
});

/** Trimmed, with empty strings as null and the price rounded to cents. */
export const formToGiftInput = (v: GiftFormModel): GiftInput => ({
  name: v.name.trim(),
  description: v.description.trim(),
  price: Math.round((v.price ?? 0) * 100) / 100,
  currency: v.currency,
  purchaseUrl: v.purchaseUrl.trim() || null,
  extraUrls: cleanUrls(v.extraUrls),
  categoryId: v.categoryId || null,
  priority: v.priority,
  isFavorite: v.isFavorite,
});
