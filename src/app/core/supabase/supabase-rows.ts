import { Category } from '../models/category';
import { Currency, Gift, GiftImage, GiftInput, Priority } from '../models/gift';
import { Invitation } from '../models/invitation';
import {
  PLAN_STATUSES,
  PlanGift,
  PlanGiftInput,
  PlanPerson,
  PlanPersonInput,
  PlanShares,
  PlanStatus,
} from '../models/plan';
import { Profile, Role } from '../models/profile';

/*
  Row shapes as PostgREST returns them (snake_case) and their mapping to the domain models.
  Columns are listed explicitly so nothing private can ever be selected by accident.
*/

export const PROFILE_COLUMNS = 'id, email, display_name, role, has_list, is_planner, created_at';
/**
 * The same without is_planner, for a database where migration 20261115040000_gift_plans has not
 * run yet (the app must keep working, just without "Nuestros regalos").
 */
export const LEGACY_PROFILE_COLUMNS = 'id, email, display_name, role, has_list, created_at';

/** PostgREST's answer when a selected column does not exist (yet). */
export const isMissingColumn = (e: { code?: string; message?: string } | null, column: string) =>
  !!e && (e.code === '42703' || e.code === 'PGRST204') && (e.message ?? '').includes(column);
export const CATEGORY_COLUMNS = 'id, name, slug, sort_order';
export const INVITATION_COLUMNS =
  'id, with_list, email_restriction, expires_at, used_at, revoked_at, created_at';
export const GIFT_COLUMNS =
  'id, name, description, price, currency, image_path, purchase_url, extra_urls, category_id, priority, is_favorite, created_at, updated_at, recipient_id, gift_status(is_reserved)';

interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  role: string;
  has_list: boolean | null;
  is_planner: boolean | null;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface InvitationRow {
  id: string;
  with_list: boolean | null;
  email_restriction: string | null;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface GiftRow {
  id: string;
  name: string;
  description: string;
  price: number | string;
  currency: string;
  image_path: string | null;
  purchase_url: string | null;
  /** Missing only if the database predates 20261117010000_extra_links. */
  extra_urls?: string[] | null;
  category_id: string | null;
  priority: Priority;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  recipient_id: string;
  /** null on your own gifts: RLS hides their status from you (the surprise). */
  gift_status: { is_reserved: boolean } | null;
}

export const toProfile = (p: ProfileRow): Profile => ({
  id: p.id,
  email: p.email,
  displayName: p.display_name,
  role: p.role as Role,
  hasList: !!p.has_list,
  isPlanner: !!p.is_planner,
  createdAt: p.created_at,
});

export const toCategory = (c: CategoryRow): Category => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  sortOrder: c.sort_order,
});

export const toInvitation = (i: InvitationRow): Invitation => ({
  id: i.id,
  withList: !!i.with_list,
  emailRestriction: i.email_restriction,
  expiresAt: i.expires_at,
  usedAt: i.used_at,
  revokedAt: i.revoked_at,
  createdAt: i.created_at,
});

export const toGift = (r: GiftRow, image: GiftImage | null): Gift => ({
  id: r.id,
  name: r.name,
  description: r.description ?? '',
  price: Number(r.price),
  currency: r.currency as Currency,
  image,
  purchaseUrl: r.purchase_url,
  extraUrls: r.extra_urls ?? [],
  categoryId: r.category_id,
  priority: r.priority,
  isFavorite: r.is_favorite,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  forId: r.recipient_id,
  isReserved: !!r.gift_status?.is_reserved,
});

/** The editable columns of a gift (image_path and recipient_id are handled separately). */
export const giftInputRow = (input: GiftInput) => ({
  name: input.name,
  description: input.description,
  price: input.price,
  currency: input.currency,
  purchase_url: input.purchaseUrl,
  extra_urls: input.extraUrls,
  category_id: input.categoryId,
  priority: input.priority,
  is_favorite: input.isFavorite,
});

// ---------------------------------------------------------------- "Nuestros regalos" (planners only)

export const PLAN_PERSON_COLUMNS = 'id, name, budget, created_at';
export const PLAN_GIFT_COLUMNS =
  'id, person_id, name, price, currency, purchase_url, extra_urls, note, image_path, status, shares, paid_by, created_at, updated_at';

export interface PlanPersonRow {
  id: string;
  name: string;
  /** numeric: PostgREST sends it as a string. */
  budget: number | string | null;
  created_at: string;
}

export interface PlanGiftRow {
  id: string;
  person_id: string;
  name: string;
  price: number | string;
  currency: string;
  purchase_url: string | null;
  /** Missing only if the database predates 20261117010000_extra_links. */
  extra_urls?: string[] | null;
  note: string | null;
  image_path: string | null;
  status: string;
  /** jsonb { "<planner id>": amount }; amounts may arrive as numbers or numeric strings. */
  shares: Record<string, number | string> | null;
  paid_by: string | null;
  created_at: string;
  updated_at: string;
}

export const toPlanPerson = (r: PlanPersonRow): PlanPerson => ({
  id: r.id,
  name: r.name,
  budget: r.budget == null ? null : Number(r.budget),
  createdAt: r.created_at,
});

const toShares = (raw: PlanGiftRow['shares']): PlanShares =>
  Object.fromEntries(Object.entries(raw ?? {}).map(([id, v]) => [id, Number(v)]));

export const toPlanGift = (r: PlanGiftRow, image: GiftImage | null): PlanGift => ({
  id: r.id,
  personId: r.person_id,
  name: r.name,
  price: Number(r.price),
  currency: r.currency as Currency,
  purchaseUrl: r.purchase_url,
  extraUrls: r.extra_urls ?? [],
  note: r.note ?? '',
  image,
  status: (PLAN_STATUSES as string[]).includes(r.status) ? (r.status as PlanStatus) : 'idea',
  shares: toShares(r.shares),
  paidBy: r.paid_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const planPersonInputRow = (input: PlanPersonInput) => ({
  name: input.name.trim().slice(0, 60),
  budget: input.budget,
});

/** The editable columns of a planned gift (image_path is handled separately). */
export const planGiftInputRow = (input: PlanGiftInput) => ({
  person_id: input.personId,
  name: input.name.trim().slice(0, 120),
  price: input.price,
  currency: input.currency,
  purchase_url: input.purchaseUrl,
  extra_urls: input.extraUrls,
  note: input.note,
  status: input.status,
  shares: input.shares,
  paid_by: input.paidBy,
});
