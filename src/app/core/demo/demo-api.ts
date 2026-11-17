import { Injectable, signal } from '@angular/core';
import {
  DEMO_ACCOUNTS,
  DEMO_CATEGORIES,
  DEMO_GIFTS,
  DEMO_INVITE_TOKEN,
  DEMO_PLAN_GIFTS,
  DEMO_PLAN_PEOPLE,
} from './demo-data';
import { ApiError } from '../api/api-error';
import { Category } from '../models/category';
import { Gift, GiftImage, GiftInput } from '../models/gift';
import { Invitation } from '../models/invitation';
import {
  PlanGift,
  PlanGiftInput,
  PlanPerson,
  PlanPersonInput,
  PlanStatus,
  Planner,
} from '../models/plan';
import { Profile, Role } from '../models/profile';
import { WishList } from '../models/wish-list';
import { WishlistApi } from '../api/wishlist-api';
import { slugify } from '../text/slugify';
import { blobToDataUrl, randomToken, readStore, sha256, writeStore } from './demo-storage';

/*
  DEMO MODE — a stand-in backend that lives in the browser.
  · Shared data in localStorage (so two tabs see the same wishlist and reservations).
  · Session per tab in sessionStorage (so tab A can be "family" and tab B "owner").
  · Status changes broadcast between tabs, the way Supabase Realtime will.
  It mirrors the database rules (roles, unique reservation, hidden identity) so the UI is
  exercised against the same errors. It is NOT security: production enforces all of this
  in PostgreSQL (docs/DATABASE.md).
*/

interface DemoUser extends Profile {
  password: string;
}
interface DemoReservation {
  giftId: string;
  reservedBy: string | null;
}
interface DemoInvitation extends Invitation {
  tokenHash: string;
  role: Role;
}
interface DemoState {
  v: 2;
  users: DemoUser[];
  categories: Category[];
  gifts: Omit<Gift, 'isReserved'>[];
  reservations: DemoReservation[]; // private: never returned to a caller
  invitations: DemoInvitation[];
  /** "Nuestros regalos": added later; load() fills them in for older stored states. */
  planPeople: PlanPerson[];
  planGifts: PlanGift[];
}

const DATA_KEY = 'mcw-demo-data-v2'; // v2: two wish lists
const SESSION_KEY = 'mcw-demo-session';
const CHANNEL = 'mcw-demo-status';

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const wait = (ms = 220 + Math.random() * 220) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class DemoApi extends WishlistApi {
  readonly isDemo = true;
  readonly profile = signal<Profile | null | undefined>(undefined);

  private memory: DemoState | null = null; // fallback when storage is blocked
  private readonly channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  private readonly listeners = new Set<(id: string, r: boolean) => void>();

  constructor() {
    super();
    this.channel?.addEventListener(
      'message',
      (e: MessageEvent<{ giftId: string; forId: string; isReserved: boolean }>) =>
        this.notify(e.data.giftId, e.data.forId, e.data.isReserved),
    );
    void this.restore();
  }

  // ---------------------------------------------------------------- state
  private async seed(): Promise<DemoState> {
    const t = now();
    const users: DemoUser[] = Object.entries(DEMO_ACCOUNTS).map(([key, a], i) => ({
      id: `u-${key}`,
      email: a.email,
      password: a.password,
      displayName: a.displayName,
      role: key === 'owner' ? 'owner' : 'family',
      hasList: key === 'owner' || key === 'partner',
      isPlanner: key === 'owner' || key === 'partner',
      createdAt: new Date(Date.now() - (30 - i * 6) * 86400000).toISOString(),
    }));
    const img = (p: string): GiftImage => ({
      sm: `stand-ins/${p}-500.jpg`,
      md: `stand-ins/${p}-960.jpg`,
      lg: `stand-ins/${p}-960.jpg`,
    });
    return {
      v: 2,
      users,
      categories: DEMO_CATEGORIES.map((c) => ({ ...c })),
      gifts: DEMO_GIFTS.map((g, i) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        price: g.price,
        currency: g.currency,
        image: img(g.photo),
        purchaseUrl: g.purchaseUrl,
        categoryId: g.categoryId,
        priority: g.priority,
        isFavorite: g.isFavorite,
        forId: `u-${g.forAccount}`,
        createdAt: new Date(Date.now() - (20 - i) * 86400000).toISOString(),
        updatedAt: t,
      })),
      reservations: DEMO_GIFTS.filter((g) => g.reservedBy).map((g) => ({
        giftId: g.id,
        reservedBy: `u-${g.reservedBy}`,
      })),
      invitations: [
        {
          id: uid(),
          tokenHash: await sha256(DEMO_INVITE_TOKEN),
          role: 'family',
          withList: false,
          emailRestriction: null,
          expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
          usedAt: null,
          revokedAt: null,
          createdAt: t,
        },
      ],
      ...this.seedPlans(),
    };
  }

  private seedPlans(): Pick<DemoState, 'planPeople' | 'planGifts'> {
    const day = 86400000;
    const id = (key: string) => `u-${key}`;
    return {
      planPeople: DEMO_PLAN_PEOPLE.map((p, i) => ({
        ...p,
        createdAt: new Date(Date.now() - (10 - i) * day).toISOString(),
      })),
      planGifts: DEMO_PLAN_GIFTS.map((g, i) => {
        const at = new Date(Date.now() - (8 - i) * day).toISOString();
        return {
          id: g.id,
          personId: g.personId,
          name: g.name,
          price: g.price,
          currency: 'EUR',
          purchaseUrl: g.purchaseUrl,
          note: g.note,
          image: null,
          status: g.status,
          shares: Object.fromEntries(Object.entries(g.shares).map(([k, v]) => [id(k), v])),
          paidBy: g.paidBy ? id(g.paidBy) : null,
          createdAt: at,
          updatedAt: at,
        };
      }),
    };
  }

  /**
   * States saved before "Nuestros regalos" existed: give the two list owners the planner flag and
   * seed the example plans, without touching anything the person already did in the demo.
   */
  private upgrade(s: DemoState): DemoState {
    let changed = false;
    for (const u of s.users) {
      if (u.isPlanner === undefined) {
        u.isPlanner = u.id === 'u-owner' || u.id === 'u-partner';
        changed = true;
      }
    }
    if (!s.planPeople || !s.planGifts) {
      Object.assign(s, this.seedPlans());
      changed = true;
    }
    if (changed) this.save(s);
    return s;
  }

  private async load(): Promise<DemoState> {
    const raw = readStore('local', DATA_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw) as DemoState;
        if (s.v === 2) return this.upgrade(s);
      } catch {
        /* fall through to a fresh seed */
      }
    }
    if (this.memory) return this.memory;
    const s = await this.seed();
    this.save(s);
    return s;
  }

  private save(s: DemoState) {
    this.memory = s;
    writeStore('local', DATA_KEY, JSON.stringify(s));
  }

  private async restore() {
    const s = await this.load();
    const id = readStore('session', SESSION_KEY);
    const u = id ? s.users.find((x) => x.id === id) : undefined;
    this.profile.set(u ? this.toProfile(u) : null);
  }

  private toProfile(u: DemoUser): Profile {
    const { password: _p, ...p } = u;
    return p;
  }

  private me(s: DemoState): DemoUser {
    const id = this.profile()?.id;
    const u = id ? s.users.find((x) => x.id === id) : undefined;
    if (!u) throw new ApiError('FORBIDDEN');
    return u;
  }
  private owner(s: DemoState) {
    if (this.me(s).role !== 'owner') throw new ApiError('FORBIDDEN');
  }

  private hasList(s: DemoState) {
    const u = this.me(s);
    if (!u.hasList) throw new ApiError('FORBIDDEN');
    return u;
  }

  /** Mirrors the gift_status RLS policy: your own gifts never show as reserved. */
  private withStatus(s: DemoState, g: Omit<Gift, 'isReserved'>): Gift {
    const mine = g.forId === this.profile()?.id;
    return { ...g, isReserved: !mine && s.reservations.some((r) => r.giftId === g.id) };
  }

  /** Mirrors Realtime + RLS: status changes of your own gifts are never delivered to you. */
  private notify(giftId: string, forId: string, isReserved: boolean) {
    if (forId === this.profile()?.id) return;
    this.listeners.forEach((l) => l(giftId, isReserved));
  }

  private broadcast(s: DemoState, giftId: string, isReserved: boolean) {
    const forId = s.gifts.find((g) => g.id === giftId)?.forId ?? '';
    this.channel?.postMessage({ giftId, forId, isReserved });
    this.notify(giftId, forId, isReserved);
  }

  // ---------------------------------------------------------------- auth
  async signIn(email: string, password: string) {
    await wait(450);
    const s = await this.load();
    const u = s.users.find(
      (x) => x.email === email.trim().toLowerCase() && x.password === password,
    );
    if (!u) throw new ApiError('INVALID_CREDENTIALS');
    writeStore('session', SESSION_KEY, u.id);
    this.profile.set(this.toProfile(u));
  }

  async checkInvitation(token: string, email?: string) {
    await wait();
    const s = await this.load();
    const h = await sha256(token);
    const inv = s.invitations.find((i) => i.tokenHash === h);
    if (!inv || inv.usedAt || inv.revokedAt || Date.parse(inv.expiresAt) <= Date.now())
      return 'invalid';
    if (email && inv.emailRestriction && inv.emailRestriction !== email.trim().toLowerCase())
      return 'email_mismatch';
    return 'valid';
  }

  /** Mirrors private.consume_invitation + private.create_profile (one transaction). */
  async signUp(input: {
    email: string;
    password: string;
    displayName: string;
    inviteToken: string;
  }) {
    await wait(500);
    const s = await this.load();
    const email = input.email.trim().toLowerCase();
    const h = await sha256(input.inviteToken);
    const inv = s.invitations.find((i) => i.tokenHash === h);
    if (!inv || inv.usedAt || inv.revokedAt || Date.parse(inv.expiresAt) <= Date.now()) {
      throw new ApiError('INVITATION_INVALID');
    }
    if (inv.emailRestriction && inv.emailRestriction !== email)
      throw new ApiError('INVITATION_EMAIL_MISMATCH');
    if (s.users.some((u) => u.email === email)) throw new ApiError('EMAIL_TAKEN');
    const user: DemoUser = {
      id: uid(),
      email,
      password: input.password,
      displayName: input.displayName.trim() || email.split('@')[0],
      role: inv.role,
      hasList: inv.withList,
      isPlanner: false,
      createdAt: now(),
    };
    inv.usedAt = now();
    s.users.push(user);
    this.save(s);
    writeStore('session', SESSION_KEY, user.id);
    this.profile.set(this.toProfile(user));
    return 'signed-in' as const;
  }

  async signOut(_everywhere = false) {
    await wait(150);
    writeStore('session', SESSION_KEY, null);
    this.profile.set(null);
  }

  async updateDisplayName(name: string) {
    await wait();
    const s = await this.load();
    const u = this.me(s);
    u.displayName = name.trim().slice(0, 60);
    this.save(s);
    this.profile.set(this.toProfile(u));
  }

  async requestPasswordReset(_email: string) {
    await wait();
  }

  async verifyRecovery(_tokenHash: string) {
    await wait();
    return false;
  }

  async updatePassword(password: string) {
    await wait();
    const s = await this.load();
    this.me(s).password = password;
    this.save(s);
  }

  // ---------------------------------------------------------------- catalogue
  async listWishLists(): Promise<WishList[]> {
    await wait(120);
    const s = await this.load();
    this.me(s);
    return s.users
      .filter((u) => u.hasList)
      .sort(
        (a, b) =>
          Number(b.role === 'owner') - Number(a.role === 'owner') ||
          a.createdAt.localeCompare(b.createdAt),
      )
      .map((u) => ({ id: u.id, name: u.displayName }));
  }

  async listCategories() {
    await wait(120);
    const s = await this.load();
    this.me(s);
    return [...s.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async listGifts() {
    await wait();
    const s = await this.load();
    this.me(s);
    return s.gifts.map((g) => this.withStatus(s, g));
  }

  async getGift(id: string) {
    await wait(160);
    const s = await this.load();
    this.me(s);
    const g = s.gifts.find((x) => x.id === id);
    return g ? this.withStatus(s, g) : null;
  }

  watchStatus(cb: (giftId: string, isReserved: boolean) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // ---------------------------------------------------------------- reservations
  async reserve(giftId: string) {
    await wait(420);
    // Tabs share the data, so serialise read-check-write across them (the database does this
    // with unique(gift_id) + ON CONFLICT DO NOTHING).
    await this.exclusive(async () => {
      const s = await this.load();
      const u = this.me(s);
      const g = s.gifts.find((x) => x.id === giftId);
      if (!g) throw new ApiError('GIFT_NOT_FOUND');
      // Checked before "already reserved", so trying never reveals the state of your own gift.
      if (g.forId === u.id) throw new ApiError('CANNOT_RESERVE_OWN_GIFT');
      if (s.reservations.some((r) => r.giftId === giftId))
        throw new ApiError('GIFT_ALREADY_RESERVED');
      s.reservations.push({ giftId, reservedBy: u.id });
      this.save(s);
      this.broadcast(s, giftId, true);
    });
  }

  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    return typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('mcw-demo-write', fn)
      : fn();
  }

  async cancelReservation(giftId: string) {
    await wait(300);
    const s = await this.load();
    const u = this.me(s);
    const i = s.reservations.findIndex((r) => r.giftId === giftId && r.reservedBy === u.id);
    if (i < 0) throw new ApiError('NO_RESERVATION_TO_CANCEL');
    s.reservations.splice(i, 1);
    this.save(s);
    this.broadcast(s, giftId, false);
  }

  async myReservations() {
    await wait(140);
    const s = await this.load();
    const u = this.me(s);
    return s.reservations.filter((r) => r.reservedBy === u.id).map((r) => r.giftId);
  }

  // ---------------------------------------------------------------- owner
  private async storeImage(blobs: Blob[]): Promise<GiftImage> {
    // blobs = [480, 960, 1600]; the demo keeps 480 + 960 only, to stay within storage quota.
    const [sm, md] = await Promise.all([
      blobToDataUrl(blobs[0]),
      blobToDataUrl(blobs[1] ?? blobs[0]),
    ]);
    return { sm, md, lg: md };
  }

  async createGift(input: GiftInput, image: Blob[] | null) {
    await wait(500);
    const s = await this.load();
    const u = this.hasList(s);
    const t = now();
    const g = {
      id: uid(),
      ...input,
      image: image ? await this.storeImage(image) : null,
      forId: u.id,
      createdAt: t,
      updatedAt: t,
    };
    s.gifts.push(g);
    this.save(s);
    return this.withStatus(s, g);
  }

  async updateGift(id: string, input: GiftInput, image: Blob[] | null | 'remove') {
    await wait(450);
    const s = await this.load();
    const u = this.hasList(s);
    const g = s.gifts.find((x) => x.id === id);
    if (!g) throw new ApiError('GIFT_NOT_FOUND');
    if (g.forId !== u.id) throw new ApiError('FORBIDDEN'); // only your own wishes
    Object.assign(g, input, { updatedAt: now() });
    if (image === 'remove') g.image = null;
    else if (image) g.image = await this.storeImage(image);
    this.save(s);
    return this.withStatus(s, g);
  }

  async deleteGift(id: string) {
    await wait(350);
    const s = await this.load();
    const u = this.hasList(s);
    if (s.gifts.find((g) => g.id === id)?.forId !== u.id) throw new ApiError('FORBIDDEN');
    s.gifts = s.gifts.filter((g) => g.id !== id);
    s.reservations = s.reservations.filter((r) => r.giftId !== id); // cascade
    this.save(s);
  }

  async releaseGift(id: string) {
    await wait(300);
    const s = await this.load();
    this.owner(s);
    // Never on your own gifts: that would spoil your surprise.
    if (s.gifts.find((g) => g.id === id)?.forId === this.me(s).id) throw new ApiError('FORBIDDEN');
    s.reservations = s.reservations.filter((r) => r.giftId !== id);
    this.save(s);
    this.broadcast(s, id, false);
  }

  async saveCategory(c: { id?: string; name: string }) {
    await wait(250);
    const s = await this.load();
    this.owner(s);
    const name = c.name.trim().slice(0, 40);
    if (c.id) {
      const cat = s.categories.find((x) => x.id === c.id);
      if (!cat) throw new ApiError('UNKNOWN');
      cat.name = name;
      this.save(s);
      return cat;
    }
    let sl = slugify(name);
    while (s.categories.some((x) => x.slug === sl)) sl = `${sl}-2`.slice(0, 40);
    const cat: Category = { id: uid(), name, slug: sl, sortOrder: s.categories.length };
    s.categories.push(cat);
    this.save(s);
    return cat;
  }

  async deleteCategory(id: string) {
    await wait(250);
    const s = await this.load();
    this.owner(s);
    if (s.gifts.some((g) => g.categoryId === id)) throw new ApiError('CATEGORY_NOT_EMPTY');
    s.categories = s.categories.filter((c) => c.id !== id);
    this.save(s);
  }

  async reorderCategories(ids: string[]) {
    await wait(200);
    const s = await this.load();
    this.owner(s);
    ids.forEach((id, i) => {
      const c = s.categories.find((x) => x.id === id);
      if (c) c.sortOrder = i;
    });
    this.save(s);
  }

  async listInvitations() {
    await wait(200);
    const s = await this.load();
    this.owner(s);
    return s.invitations
      .filter((i) => i.role === 'family')
      .map(({ tokenHash: _h, role: _r, ...i }) => i)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createInvitation(email: string | null, days: number, withList = false) {
    await wait(350);
    const s = await this.load();
    this.owner(s);
    // Same rules as the database: email required, 7 days at most.
    if (!email?.trim()) throw new ApiError('EMAIL_REQUIRED');
    const token = randomToken();
    s.invitations.push({
      id: uid(),
      tokenHash: await sha256(token),
      role: 'family',
      withList,
      emailRestriction: email?.trim().toLowerCase() || null,
      expiresAt: new Date(Date.now() + Math.min(Math.max(days, 1), 7) * 86400000).toISOString(),
      usedAt: null,
      revokedAt: null,
      createdAt: now(),
    });
    this.save(s);
    return token;
  }

  async revokeInvitation(id: string) {
    await wait(200);
    const s = await this.load();
    this.owner(s);
    const i = s.invitations.find((x) => x.id === id);
    if (i && !i.usedAt) i.revokedAt = now();
    this.save(s);
  }

  async listFamily() {
    await wait(200);
    const s = await this.load();
    this.owner(s);
    return s.users.filter((u) => u.role === 'family').map((u) => this.toProfile(u));
  }

  async removeFamilyMember(id: string) {
    await wait(300);
    const s = await this.load();
    this.owner(s);
    s.users = s.users.filter((u) => !(u.id === id && u.role === 'family'));
    // Someone with a list of their own takes it with them (gifts.recipient_id … on delete cascade).
    const gone = new Set(s.gifts.filter((g) => g.forId === id).map((g) => g.id));
    s.gifts = s.gifts.filter((g) => !gone.has(g.id));
    s.reservations = s.reservations.filter((r) => !gone.has(r.giftId));
    // Their reservations stay (reserved_by → null): removing someone must not reveal what they held.
    s.reservations.forEach((r) => {
      if (r.reservedBy === id) r.reservedBy = null;
    });
    this.save(s);
  }

  /** Demo only: wipe local data back to the seed. */
  async reset() {
    writeStore('local', DATA_KEY, null);
    this.memory = null;
    this.save(await this.seed());
    await this.restore();
  }

  // ---------------------------------------------------------------- "Nuestros regalos" (planners only)
  // Mirrors the plan_* RLS policies (profiles.is_planner) and the plan_gifts check trigger.

  private planner(s: DemoState): DemoUser {
    const u = this.me(s);
    if (!u.isPlanner) throw new ApiError('FORBIDDEN');
    return u;
  }

  private plannerIds(s: DemoState) {
    return new Set(s.users.filter((u) => u.isPlanner).map((u) => u.id));
  }

  /** Same checks as private.check_plan_gift(): shares of planners, ≥ 0, adding up to the price. */
  private checkPlanGift(s: DemoState, input: PlanGiftInput) {
    const planners = this.plannerIds(s);
    const entries = Object.entries(input.shares);
    if (entries.some(([id, v]) => !planners.has(id) || !Number.isFinite(v) || v < 0))
      throw new ApiError('PLAN_SHARES_INVALID');
    if (input.paidBy !== null && !planners.has(input.paidBy))
      throw new ApiError('PLAN_SHARES_INVALID');
    const cents = (n: number) => Math.round(n * 100);
    const total = entries.reduce((sum, [, v]) => sum + cents(v), 0);
    if (total !== cents(input.price)) throw new ApiError('PLAN_SHARES_MISMATCH');
    if (!s.planPeople.some((p) => p.id === input.personId))
      throw new ApiError('UNKNOWN', 'Esa persona ya no está en la lista.');
  }

  async listPlanners(): Promise<Planner[]> {
    await wait(120);
    const s = await this.load();
    this.planner(s);
    return s.users
      .filter((u) => u.isPlanner)
      .sort(
        (a, b) =>
          Number(b.role === 'owner') - Number(a.role === 'owner') ||
          a.createdAt.localeCompare(b.createdAt),
      )
      .map((u) => ({ id: u.id, name: u.displayName }));
  }

  async listPlanPeople(): Promise<PlanPerson[]> {
    await wait(150);
    const s = await this.load();
    this.planner(s);
    return [...s.planPeople].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async savePlanPerson(id: string | null, input: PlanPersonInput): Promise<PlanPerson> {
    await wait(250);
    const s = await this.load();
    this.planner(s);
    const name = input.name.trim().slice(0, 60);
    if (!name) throw new ApiError('UNKNOWN', 'Escribe un nombre.');
    if (input.budget !== null && !(input.budget >= 0))
      throw new ApiError('UNKNOWN', 'Revisa el presupuesto.');
    if (id) {
      const p = s.planPeople.find((x) => x.id === id);
      if (!p) throw new ApiError('UNKNOWN', 'Esa persona ya no está en la lista.');
      Object.assign(p, { name, budget: input.budget });
      this.save(s);
      return { ...p };
    }
    const p: PlanPerson = { id: uid(), name, budget: input.budget, createdAt: now() };
    s.planPeople.push(p);
    this.save(s);
    return { ...p };
  }

  async deletePlanPerson(id: string) {
    await wait(250);
    const s = await this.load();
    this.planner(s);
    s.planPeople = s.planPeople.filter((p) => p.id !== id);
    s.planGifts = s.planGifts.filter((g) => g.personId !== id); // on delete cascade
    this.save(s);
  }

  async listPlanGifts(): Promise<PlanGift[]> {
    await wait();
    const s = await this.load();
    this.planner(s);
    return [...s.planGifts]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((g) => ({ ...g, shares: { ...g.shares } }));
  }

  async savePlanGift(id: string | null, input: PlanGiftInput, image: Blob[] | null | 'remove') {
    await wait(450);
    const s = await this.load();
    this.planner(s);
    this.checkPlanGift(s, input);
    const fields = {
      ...input,
      name: input.name.trim().slice(0, 120),
      shares: { ...input.shares },
    };
    const t = now();
    if (!id) {
      const g: PlanGift = {
        id: uid(),
        ...fields,
        image: image && image !== 'remove' ? await this.storeImage(image) : null,
        createdAt: t,
        updatedAt: t,
      };
      s.planGifts.push(g);
      this.save(s);
      return { ...g };
    }
    const g = s.planGifts.find((x) => x.id === id);
    if (!g) throw new ApiError('GIFT_NOT_FOUND');
    Object.assign(g, fields, { updatedAt: t });
    if (image === 'remove') g.image = null;
    else if (image) g.image = await this.storeImage(image);
    this.save(s);
    return { ...g };
  }

  async setPlanGiftStatus(id: string, status: PlanStatus) {
    await wait(200);
    const s = await this.load();
    this.planner(s);
    const g = s.planGifts.find((x) => x.id === id);
    if (!g) throw new ApiError('GIFT_NOT_FOUND');
    g.status = status;
    g.updatedAt = now();
    this.save(s);
  }

  async deletePlanGift(id: string) {
    await wait(250);
    const s = await this.load();
    this.planner(s);
    s.planGifts = s.planGifts.filter((g) => g.id !== id);
    this.save(s);
  }
}
