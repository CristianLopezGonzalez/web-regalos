import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Session } from '@supabase/supabase-js';
import { ApiError } from '../api/api-error';
import { WishlistApi } from '../api/wishlist-api';
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
import { slugify } from '../text/slugify';
import { GiftImageStore } from './gift-image-store';
import { SUPABASE_CLIENT } from './supabase-client';
import { check, toApiError } from './supabase-errors';
import {
  CATEGORY_COLUMNS,
  GIFT_COLUMNS,
  GiftRow,
  INVITATION_COLUMNS,
  PLAN_GIFT_COLUMNS,
  PLAN_PERSON_COLUMNS,
  LEGACY_PROFILE_COLUMNS,
  PROFILE_COLUMNS,
  isMissingColumn,
  PlanGiftRow,
  PlanPersonRow,
  giftInputRow,
  planGiftInputRow,
  planPersonInputRow,
  toCategory,
  toGift,
  toInvitation,
  toPlanGift,
  toPlanPerson,
  toProfile,
} from './supabase-rows';

/*
  PRODUCTION BACKEND — Supabase Auth + PostgreSQL (RLS + RPC) + Storage + Realtime.
  This class only asks; every permission is decided by the database
  (supabase/migrations/20261114000000_init.sql). It never sees who reserved a gift because
  no table or function it can reach returns that.
*/

const CATEGORY_SLUG_MAX = 34;

@Injectable()
export class SupabaseApi extends WishlistApi {
  private readonly router = inject(Router);
  private readonly client = inject(SUPABASE_CLIENT);

  readonly isDemo = false;
  readonly profile = signal<Profile | null | undefined>(undefined);
  /** True while the user arrived from a password-recovery link. */
  readonly recovering = signal(false);

  private readonly images = new GiftImageStore(this.client);
  private readonly planImages = new GiftImageStore(this.client, 'plan-images', 'plans');
  private loadedFor: string | null = null;

  constructor() {
    super();
    void this.client
      .then((sb) =>
        sb.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            this.recovering.set(true);
            // Older-style links (?code=…) land wherever Supabase sends them: take the person to the form.
            if (!location.pathname.startsWith('/reset-password')) {
              setTimeout(
                () => void this.router.navigateByUrl('/reset-password', { replaceUrl: true }),
                0,
              );
            }
          }
          // Never await Supabase calls inside this callback (it can deadlock the auth lock).
          setTimeout(() => void this.syncProfile(session), 0);
        }),
      )
      .catch(() => this.profile.set(null));
  }

  /** 'error' = the profile could not be read (the session is kept); 'missing' = no such account. */
  private async syncProfile(session: Session | null): Promise<'ok' | 'error' | 'missing'> {
    const sb = await this.client;
    const uid = session?.user.id ?? null;
    if (!uid) {
      this.forgetSession();
      return 'missing';
    }
    if (this.loadedFor === uid && this.profile()) return 'ok';
    const { data, error } = await this.selectProfiles((cols) =>
      sb.from('profiles').select(cols).eq('id', uid).maybeSingle(),
    );
    if (error) {
      // A failed read (network, server) is not a missing account: keep the session, so the next
      // attempt (reload, sign-in) can succeed. Signing out here locked everyone out on 2026-11-15.
      console.error('[profile] could not be read', error);
      this.profile.set(null);
      return 'error';
    }
    if (!data) {
      // Account without profile (e.g. removed by the owner): end the session.
      await sb.auth.signOut();
      this.profile.set(null);
      return 'missing';
    }
    this.loadedFor = uid;
    this.profile.set(toProfile(data as unknown as Parameters<typeof toProfile>[0]));
    return 'ok';
  }

  /** Columns that worked last time: drops is_planner when the database doesn't have it yet. */
  private profileColumns = PROFILE_COLUMNS;

  private async selectProfiles<R extends { error: { code?: string; message?: string } | null }>(
    run: (columns: string) => PromiseLike<R>,
  ): Promise<R> {
    const first = await run(this.profileColumns);
    if (!isMissingColumn(first.error, 'is_planner')) return first;
    console.warn('[profile] is_planner missing: run migration 20261115040000_gift_plans');
    this.profileColumns = LEGACY_PROFILE_COLUMNS;
    return run(this.profileColumns);
  }

  private forgetSession() {
    this.loadedFor = null;
    this.images.clear();
    this.planImages.clear();
    this.profile.set(null);
  }

  // ---------------------------------------------------------------- auth
  async signIn(email: string, password: string) {
    const sb = await this.client;
    const r = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (r.error) throw toApiError(r.error);
    const outcome = await this.syncProfile(r.data.session);
    if (outcome === 'error')
      throw new ApiError(
        'UNKNOWN',
        'No se pudo cargar tu perfil. Inténtalo otra vez en un momento.',
      );
    if (outcome === 'missing') throw new ApiError('INVALID_CREDENTIALS');
  }

  async checkInvitation(token: string, email?: string) {
    const sb = await this.client;
    const r = await sb.rpc('check_invitation', { p_token: token, p_email: email ?? null });
    const v = check(r) as string;
    return v === 'valid' ? 'valid' : v === 'email_mismatch' ? 'email_mismatch' : 'invalid';
  }

  async signUp(input: {
    email: string;
    password: string;
    displayName: string;
    inviteToken: string;
  }) {
    const sb = await this.client;
    const email = input.email.trim().toLowerCase();
    // Friendly early check; the database re-checks (and consumes) inside the sign-up transaction.
    const pre = await this.checkInvitation(input.inviteToken, email);
    if (pre === 'email_mismatch') throw new ApiError('INVITATION_EMAIL_MISMATCH');
    if (pre === 'invalid') throw new ApiError('INVITATION_INVALID');
    const r = await sb.auth.signUp({
      email,
      password: input.password,
      options: {
        data: { invite_token: input.inviteToken, display_name: input.displayName.trim() },
        emailRedirectTo: `${location.origin}/login`,
      },
    });
    const data = check(r);
    // With "Confirm email" on, Supabase returns a user with no identities when the email exists.
    if (data.user && data.user.identities && data.user.identities.length === 0)
      throw new ApiError('EMAIL_TAKEN');
    if (data.session) {
      await this.syncProfile(data.session);
      return 'signed-in' as const;
    }
    return 'confirm-email' as const;
  }

  async signOut() {
    const sb = await this.client;
    await sb.auth.signOut();
    this.forgetSession();
  }

  async updateDisplayName(name: string) {
    const sb = await this.client;
    const p = this.profile();
    if (!p) throw new ApiError('FORBIDDEN');
    const n = name.trim().slice(0, 60);
    check(await sb.from('profiles').update({ display_name: n }).eq('id', p.id));
    this.profile.set({ ...p, displayName: n });
  }

  async requestPasswordReset(email: string) {
    const sb = await this.client;
    // Supabase answers the same whether or not the account exists; a real error means the email was NOT sent
    // (rate limit, sender not configured…), so it must be shown instead of "we sent you a link".
    const r = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${location.origin}/reset-password`,
    });
    if (r.error) {
      console.error('[password reset]', r.error);
      throw toApiError(r.error);
    }
  }

  async verifyRecovery(tokenHash: string) {
    const sb = await this.client;
    const { data, error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    if (error || !data.session) {
      console.error('[password reset] invalid link', error);
      return false;
    }
    this.recovering.set(true);
    await this.syncProfile(data.session); // so the page shows the form, not "link expired", right away
    return true;
  }

  async updatePassword(password: string) {
    const sb = await this.client;
    const r = await sb.auth.updateUser({ password });
    if (r.error) throw toApiError(r.error);
    this.recovering.set(false);
  }

  // ---------------------------------------------------------------- catalogue
  async listWishLists(): Promise<WishList[]> {
    const sb = await this.client;
    const rows = check(await sb.rpc('wish_lists')) as unknown as
      { id: string; name: string }[] | null;
    return (rows ?? []).map((r) => ({ id: r.id, name: r.name }));
  }

  async listCategories(): Promise<Category[]> {
    const sb = await this.client;
    return check(await sb.from('categories').select(CATEGORY_COLUMNS).order('sort_order')).map(
      toCategory,
    );
  }

  async listGifts(): Promise<Gift[]> {
    const sb = await this.client;
    const rows = check(
      await sb.from('gifts').select(GIFT_COLUMNS).order('created_at'),
    ) as unknown as GiftRow[];
    await this.images.sign(rows.map((r) => r.image_path));
    return rows.map((r) => toGift(r, this.images.imageFor(r.image_path)));
  }

  async getGift(id: string) {
    const sb = await this.client;
    const row = check(
      await sb.from('gifts').select(GIFT_COLUMNS).eq('id', id).maybeSingle(),
    ) as unknown as GiftRow | null;
    if (!row) return null;
    await this.images.sign([row.image_path]);
    return toGift(row, this.images.imageFor(row.image_path));
  }

  watchStatus(cb: (giftId: string, isReserved: boolean) => void) {
    let stop = false;
    let cleanup = () => {
      stop = true;
    };
    void this.client.then((sb) => {
      if (stop) return;
      const channel = sb
        .channel(`gift-status-${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'gift_status' },
          (payload) => {
            const row = payload.new as { gift_id?: string; is_reserved?: boolean };
            if (row?.gift_id != null && typeof row.is_reserved === 'boolean')
              cb(row.gift_id, row.is_reserved);
          },
        )
        .subscribe();
      cleanup = () => void sb.removeChannel(channel);
    });
    return () => cleanup();
  }

  // ---------------------------------------------------------------- reservations
  async reserve(giftId: string) {
    const sb = await this.client;
    check(await sb.rpc('reserve_gift', { p_gift_id: giftId }));
  }

  async cancelReservation(giftId: string) {
    const sb = await this.client;
    check(await sb.rpc('cancel_reservation', { p_gift_id: giftId }));
  }

  async myReservations() {
    const sb = await this.client;
    const rows = check(await sb.rpc('my_reservations')) as unknown as string[] | null;
    return rows ?? [];
  }

  // ---------------------------------------------------------------- own gifts
  async createGift(input: GiftInput, image: Blob[] | null) {
    const sb = await this.client;
    // The row must exist first: the Storage policy only lets you write into the folder of a gift of yours.
    const created = check(await sb.from('gifts').insert(giftInputRow(input)).select('id').single());
    if (image) {
      let folder: string | null = null;
      try {
        folder = await this.images.upload(created.id, image);
        check(await sb.from('gifts').update({ image_path: folder }).eq('id', created.id));
      } catch (e) {
        // All or nothing. Keeping the gift while the form still says "Nuevo regalo" is how retries
        // turned into duplicates (Safari, 2026-11-15): undo it so trying again is safe.
        console.error('[gift photo] upload failed, rolling back the new gift', e);
        await this.images.remove(folder).catch(() => undefined);
        await sb
          .from('gifts')
          .delete()
          .eq('id', created.id)
          .then(
            () => undefined,
            () => undefined,
          );
        throw new ApiError(
          'UNKNOWN',
          'No se pudo subir la foto, así que el regalo no se ha guardado. Prueba de nuevo, con otra foto o sin foto.',
        );
      }
    }
    const gift = await this.getGift(created.id);
    if (!gift) throw new ApiError('GIFT_NOT_FOUND');
    return gift;
  }

  async updateGift(id: string, input: GiftInput, image: Blob[] | null | 'remove') {
    const sb = await this.client;
    const current = check(await sb.from('gifts').select('image_path').eq('id', id).maybeSingle());
    if (!current) throw new ApiError('GIFT_NOT_FOUND');
    let image_path: string | null | undefined;
    if (image === 'remove') image_path = null;
    else if (image) image_path = await this.images.upload(id, image);
    check(
      await sb
        .from('gifts')
        .update({ ...giftInputRow(input), ...(image_path !== undefined ? { image_path } : {}) })
        .eq('id', id),
    );
    if (image_path !== undefined) await this.images.remove(current.image_path);
    const g = await this.getGift(id);
    if (!g) throw new ApiError('GIFT_NOT_FOUND');
    return g;
  }

  async deleteGift(id: string) {
    const sb = await this.client;
    const current = check(await sb.from('gifts').select('image_path').eq('id', id).maybeSingle());
    check(await sb.from('gifts').delete().eq('id', id));
    await this.images.remove(current?.image_path ?? null);
  }

  // ---------------------------------------------------------------- owner
  async releaseGift(id: string) {
    const sb = await this.client;
    check(await sb.rpc('release_gift', { p_gift_id: id }));
  }

  async saveCategory(c: { id?: string; name: string }): Promise<Category> {
    const sb = await this.client;
    const name = c.name.trim().slice(0, 40);
    if (c.id) {
      const r = check(
        await sb
          .from('categories')
          .update({ name })
          .eq('id', c.id)
          .select(CATEGORY_COLUMNS)
          .single(),
      );
      return toCategory(r);
    }
    const existing = check(await sb.from('categories').select('slug, sort_order'));
    const taken = new Set(existing.map((x) => x.slug));
    const base = slugify(name, CATEGORY_SLUG_MAX);
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    const sortOrder = existing.reduce((m, x) => Math.max(m, x.sort_order + 1), 0);
    const r = check(
      await sb
        .from('categories')
        .insert({ name, slug, sort_order: sortOrder })
        .select(CATEGORY_COLUMNS)
        .single(),
    );
    return toCategory(r);
  }

  async deleteCategory(id: string) {
    const sb = await this.client;
    const used = check(
      await sb
        .from('gifts')
        .select('id', { count: 'exact', head: false })
        .eq('category_id', id)
        .limit(1),
    );
    if (used.length) throw new ApiError('CATEGORY_NOT_EMPTY');
    check(await sb.from('categories').delete().eq('id', id));
  }

  async reorderCategories(ids: string[]) {
    const sb = await this.client;
    await Promise.all(
      ids.map((id, i) => sb.from('categories').update({ sort_order: i }).eq('id', id).then(check)),
    );
  }

  async listInvitations(): Promise<Invitation[]> {
    const sb = await this.client;
    const rows = check(
      await sb
        .from('invitations')
        .select(INVITATION_COLUMNS)
        .eq('role', 'family')
        .order('created_at', { ascending: false }),
    );
    return rows.map(toInvitation);
  }

  async createInvitation(email: string | null, days: number, withList = false) {
    const sb = await this.client;
    return check(
      await sb.rpc('create_invitation', { p_email: email, p_days: days, p_with_list: withList }),
    ) as unknown as string;
  }

  async revokeInvitation(id: string) {
    const sb = await this.client;
    check(
      await sb
        .from('invitations')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .is('used_at', null),
    );
  }

  async listFamily(): Promise<Profile[]> {
    const sb = await this.client;
    const rows = check(
      await this.selectProfiles((cols) =>
        sb.from('profiles').select(cols).eq('role', 'family').order('created_at'),
      ),
    ) as unknown as Parameters<typeof toProfile>[0][];
    return rows.map(toProfile);
  }

  async removeFamilyMember(id: string) {
    const sb = await this.client;
    check(await sb.rpc('remove_family_member', { p_user_id: id }));
  }

  // ---------------------------------------------------------------- "Nuestros regalos" (planners only)
  // RLS (profiles.is_planner) refuses every one of these to anyone else; the photos live in their
  // own private bucket, which only the planners can list or read.

  async listPlanners(): Promise<Planner[]> {
    const sb = await this.client;
    const rows = check(await sb.rpc('planners')) as unknown as
      { id: string; name: string }[] | null;
    return (rows ?? []).map((r) => ({ id: r.id, name: r.name }));
  }

  async listPlanPeople(): Promise<PlanPerson[]> {
    const sb = await this.client;
    const rows = check(
      await sb.from('plan_people').select(PLAN_PERSON_COLUMNS).order('created_at'),
    ) as unknown as PlanPersonRow[];
    return rows.map(toPlanPerson);
  }

  async savePlanPerson(id: string | null, input: PlanPersonInput): Promise<PlanPerson> {
    const sb = await this.client;
    const row = planPersonInputRow(input);
    const saved = check(
      id
        ? await sb.from('plan_people').update(row).eq('id', id).select(PLAN_PERSON_COLUMNS).single()
        : await sb.from('plan_people').insert(row).select(PLAN_PERSON_COLUMNS).single(),
    ) as unknown as PlanPersonRow;
    return toPlanPerson(saved);
  }

  async deletePlanPerson(id: string) {
    const sb = await this.client;
    // Their gifts go with them (on delete cascade); collect the photo folders first.
    const gifts = check(
      await sb.from('plan_gifts').select('image_path').eq('person_id', id),
    ) as unknown as { image_path: string | null }[];
    check(await sb.from('plan_people').delete().eq('id', id));
    await Promise.all(
      gifts.map((g) => this.planImages.remove(g.image_path).catch(() => undefined)),
    );
  }

  async listPlanGifts(): Promise<PlanGift[]> {
    const sb = await this.client;
    const rows = check(
      await sb.from('plan_gifts').select(PLAN_GIFT_COLUMNS).order('created_at'),
    ) as unknown as PlanGiftRow[];
    await this.planImages.sign(rows.map((r) => r.image_path));
    return rows.map((r) => toPlanGift(r, this.planImages.imageFor(r.image_path)));
  }

  private async getPlanGift(id: string): Promise<PlanGift> {
    const sb = await this.client;
    const row = check(
      await sb.from('plan_gifts').select(PLAN_GIFT_COLUMNS).eq('id', id).maybeSingle(),
    ) as unknown as PlanGiftRow | null;
    if (!row) throw new ApiError('GIFT_NOT_FOUND');
    await this.planImages.sign([row.image_path]);
    return toPlanGift(row, this.planImages.imageFor(row.image_path));
  }

  async savePlanGift(id: string | null, input: PlanGiftInput, image: Blob[] | null | 'remove') {
    const sb = await this.client;
    const row = planGiftInputRow(input);

    if (!id) {
      const created = check(
        await sb.from('plan_gifts').insert(row).select('id').single(),
      ) as unknown as { id: string };
      if (image && image !== 'remove') {
        let folder: string | null = null;
        try {
          folder = await this.planImages.upload(created.id, image);
          check(await sb.from('plan_gifts').update({ image_path: folder }).eq('id', created.id));
        } catch (e) {
          // All or nothing, like createGift: a kept gift + a retry would make a duplicate.
          console.error('[plan photo] upload failed, rolling back the new gift', e);
          await this.planImages.remove(folder).catch(() => undefined);
          await sb
            .from('plan_gifts')
            .delete()
            .eq('id', created.id)
            .then(
              () => undefined,
              () => undefined,
            );
          throw new ApiError(
            'UNKNOWN',
            'No se pudo subir la foto, así que el regalo no se ha guardado. Prueba de nuevo, con otra foto o sin foto.',
          );
        }
      }
      return this.getPlanGift(created.id);
    }

    // Update: a failed upload throws before anything changes, so the old photo stays.
    const current = check(
      await sb.from('plan_gifts').select('image_path').eq('id', id).maybeSingle(),
    ) as unknown as { image_path: string | null } | null;
    if (!current) throw new ApiError('GIFT_NOT_FOUND');
    let image_path: string | null | undefined;
    if (image === 'remove') image_path = null;
    else if (image) image_path = await this.planImages.upload(id, image);
    try {
      check(
        await sb
          .from('plan_gifts')
          .update({ ...row, ...(image_path !== undefined ? { image_path } : {}) })
          .eq('id', id),
      );
    } catch (e) {
      if (image_path) await this.planImages.remove(image_path).catch(() => undefined);
      throw e;
    }
    if (image_path !== undefined)
      await this.planImages.remove(current.image_path).catch(() => undefined);
    return this.getPlanGift(id);
  }

  async setPlanGiftStatus(id: string, status: PlanStatus) {
    const sb = await this.client;
    check(await sb.from('plan_gifts').update({ status }).eq('id', id));
  }

  async deletePlanGift(id: string) {
    const sb = await this.client;
    const current = check(
      await sb.from('plan_gifts').select('image_path').eq('id', id).maybeSingle(),
    ) as unknown as { image_path: string | null } | null;
    check(await sb.from('plan_gifts').delete().eq('id', id));
    await this.planImages.remove(current?.image_path ?? null).catch(() => undefined);
  }
}
