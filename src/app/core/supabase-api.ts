import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthError, PostgrestError, Session, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';
import {
  ApiError,
  ApiErrorCode,
  Category,
  Currency,
  Gift,
  GiftImage,
  GiftInput,
  Invitation,
  Priority,
  Profile,
  Role,
} from './models';
import { WishlistApi } from './wishlist-api';

/*
  PRODUCTION BACKEND — Supabase Auth + PostgreSQL (RLS + RPC) + Storage + Realtime.
  This class only asks; every permission is decided by the database
  (supabase/migrations/20261114000000_init.sql). It never sees who reserved a gift because
  no table or function it can reach returns that.
*/

const BUCKET = 'gift-images';
const SIZES = ['480', '960', '1600'] as const;
const SIGNED_TTL = 60 * 60; // 1 h

interface GiftRow {
  id: string;
  name: string;
  description: string;
  price: number | string;
  currency: string;
  image_path: string | null;
  purchase_url: string | null;
  category_id: string | null;
  priority: Priority;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  gift_status: { is_reserved: boolean } | null;
}
const GIFT_COLUMNS =
  'id, name, description, price, currency, image_path, purchase_url, category_id, priority, is_favorite, created_at, updated_at, gift_status(is_reserved)';

const CODES: ApiErrorCode[] = [
  'GIFT_ALREADY_RESERVED',
  'NO_RESERVATION_TO_CANCEL',
  'ONLY_FAMILY_CAN_RESERVE',
  'GIFT_NOT_FOUND',
  'FORBIDDEN',
  'INVITATION_EMAIL_MISMATCH',
  'INVITATION_INVALID',
];

/** Turns Supabase / PostgREST / network errors into the app's error codes. */
function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  const msg = (e as { message?: string } | null)?.message ?? '';
  const code = CODES.find((c) => msg.includes(c));
  if (code) return new ApiError(code);
  if ((e as AuthError)?.name?.startsWith?.('Auth')) {
    const ae = e as AuthError;
    if (ae.code === 'invalid_credentials' || /invalid login/i.test(msg))
      return new ApiError('INVALID_CREDENTIALS');
    if (ae.code === 'email_not_confirmed' || /not confirmed/i.test(msg))
      return new ApiError('EMAIL_NOT_CONFIRMED');
    if (ae.code === 'user_already_exists' || /already registered/i.test(msg))
      return new ApiError('EMAIL_TAKEN');
    // Any other trigger failure during sign-up: report it as what it is, not as a bad invitation.
    if (/database error saving new user/i.test(msg)) {
      console.error('[sign-up] database error', e);
      return new ApiError('UNKNOWN', 'No se pudo crear la cuenta por un error del servidor. Avísame y lo reviso.');
    }
    if (ae.code === 'over_email_send_rate_limit' || ae.status === 429)
      return new ApiError(
        'UNKNOWN',
        'Se han enviado demasiados emails. Espera un rato (hasta una hora) y vuelve a intentarlo.',
      );
    // Supabase's built-in sender only delivers to the project's team members until custom SMTP is set up.
    if (ae.code === 'email_address_not_authorized' || /not authorized/i.test(msg))
      return new ApiError('UNKNOWN', 'No se pudo enviar el correo: el envío de emails todavía no está configurado.');
    if (/error sending|smtp/i.test(msg))
      return new ApiError('UNKNOWN', 'No se pudo enviar el correo ahora mismo. Inténtalo más tarde.');
  }
  if ((e as PostgrestError)?.code === '42501') return new ApiError('FORBIDDEN');
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return new ApiError('NETWORK');
  console.error('[supabase] unexpected error', e);
  return new ApiError('UNKNOWN');
}

/**
 * Unwraps a Supabase { data, error } result, throwing an ApiError. Typed as non-null because
 * Supabase only returns null data together with an error; `maybeSingle()` callers still null-check.
 */
function check<D>(r: { data: D; error: unknown }): NonNullable<D> {
  if (r.error) throw toApiError(r.error);
  return r.data as NonNullable<D>;
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 34) || 'categoria';

@Injectable()
export class SupabaseApi extends WishlistApi {
  readonly isDemo = false;
  readonly profile = signal<Profile | null | undefined>(undefined);
  /** True while the user arrived from a password-recovery link. */
  readonly recovering = signal(false);

  /** The SDK is loaded on demand so it never delays the first paint (hero). */
  private readonly client: Promise<SupabaseClient> = import('@supabase/supabase-js').then(
    ({ createClient }) =>
      createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      }),
  );
  private c() {
    return this.client;
  }
  private readonly router = inject(Router);
  private readonly signed = new Map<string, { url: string; expires: number }>();
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
              setTimeout(() => void this.router.navigateByUrl('/reset-password', { replaceUrl: true }), 0);
            }
          }
          // Never await Supabase calls inside this callback (it can deadlock the auth lock).
          setTimeout(() => void this.syncProfile(session), 0);
        }),
      )
      .catch(() => this.profile.set(null));
  }

  private async syncProfile(session: Session | null) {
    const sb = await this.c();
    const uid = session?.user.id ?? null;
    if (!uid) {
      this.loadedFor = null;
      this.signed.clear();
      this.profile.set(null);
      return;
    }
    if (this.loadedFor === uid && this.profile()) return;
    const { data, error } = await sb
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .eq('id', uid)
      .maybeSingle();
    if (error || !data) {
      // Account without profile (e.g. removed by the owner): end the session.
      await sb.auth.signOut();
      this.profile.set(null);
      return;
    }
    this.loadedFor = uid;
    this.profile.set({
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      role: data.role as Role,
      createdAt: data.created_at,
    });
  }

  // ---------------------------------------------------------------- auth
  async signIn(email: string, password: string) {
    const sb = await this.c();
    const r = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (r.error) throw toApiError(r.error);
    await this.syncProfile(r.data.session);
    if (!this.profile()) throw new ApiError('INVALID_CREDENTIALS');
  }

  async checkInvitation(token: string, email?: string) {
    const sb = await this.c();
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
    const sb = await this.c();
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
    const sb = await this.c();
    await sb.auth.signOut();
    this.loadedFor = null;
    this.signed.clear();
    this.profile.set(null);
  }

  async updateDisplayName(name: string) {
    const sb = await this.c();
    const p = this.profile();
    if (!p) throw new ApiError('FORBIDDEN');
    const n = name.trim().slice(0, 60);
    check(await sb.from('profiles').update({ display_name: n }).eq('id', p.id));
    this.profile.set({ ...p, displayName: n });
  }

  async requestPasswordReset(email: string) {
    const sb = await this.c();
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
    const sb = await this.c();
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
    const sb = await this.c();
    const r = await sb.auth.updateUser({ password });
    if (r.error) throw toApiError(r.error);
    this.recovering.set(false);
  }

  // ---------------------------------------------------------------- catalogue
  async listCategories(): Promise<Category[]> {
    const sb = await this.c();
    const rows = check(
      await sb.from('categories').select('id, name, slug, sort_order').order('sort_order'),
    );
    return rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, sortOrder: c.sort_order }));
  }

  async listGifts(): Promise<Gift[]> {
    const sb = await this.c();
    const rows = check(
      await sb.from('gifts').select(GIFT_COLUMNS).order('created_at'),
    ) as unknown as GiftRow[];
    await this.signAll(rows.map((r) => r.image_path));
    return rows.map((r) => this.toGift(r));
  }

  async getGift(id: string) {
    const sb = await this.c();
    const row = check(
      await sb.from('gifts').select(GIFT_COLUMNS).eq('id', id).maybeSingle(),
    ) as unknown as GiftRow | null;
    if (!row) return null;
    await this.signAll([row.image_path]);
    return this.toGift(row);
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

  private toGift(r: GiftRow): Gift {
    return {
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      price: Number(r.price),
      currency: r.currency as Currency,
      image: this.imageFor(r.image_path),
      purchaseUrl: r.purchase_url,
      categoryId: r.category_id,
      priority: r.priority,
      isFavorite: r.is_favorite,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isReserved: !!r.gift_status?.is_reserved,
    };
  }

  // ---------------------------------------------------------------- images (private bucket, signed URLs)
  private async signAll(folders: (string | null)[]) {
    const sb = await this.c();
    const now = Date.now();
    const paths = folders
      .filter((f): f is string => !!f)
      .flatMap((f) => SIZES.map((s) => `${f}/${s}.webp`))
      .filter((p) => {
        const c = this.signed.get(p);
        return !c || c.expires - now < 5 * 60 * 1000;
      });
    if (!paths.length) return;
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL);
    if (error) return; // images degrade to the "no photo" placeholder; data still loads
    for (const d of data ?? []) {
      if (d.signedUrl && d.path)
        this.signed.set(d.path, { url: d.signedUrl, expires: now + SIGNED_TTL * 1000 });
    }
  }

  private imageFor(folder: string | null): GiftImage | null {
    if (!folder) return null;
    const get = (s: string) => this.signed.get(`${folder}/${s}.webp`)?.url;
    const sm = get('480');
    const md = get('960') ?? sm;
    const lg = get('1600') ?? md;
    return sm && md && lg ? { sm, md, lg } : null;
  }

  private async upload(giftId: string, blobs: Blob[]): Promise<string> {
    const sb = await this.c();
    const folder = `gifts/${giftId}/${Date.now()}`;
    await Promise.all(
      SIZES.map((s, i) =>
        sb.storage
          .from(BUCKET)
          .upload(`${folder}/${s}.webp`, blobs[i] ?? blobs[blobs.length - 1], {
            contentType: 'image/webp',
            upsert: false,
          })
          .then(check),
      ),
    );
    return folder;
  }

  private async removeFolder(folder: string | null) {
    const sb = await this.c();
    if (!folder) return;
    await sb.storage.from(BUCKET).remove(SIZES.map((s) => `${folder}/${s}.webp`));
  }

  // ---------------------------------------------------------------- reservations
  async reserve(giftId: string) {
    const sb = await this.c();
    check(await sb.rpc('reserve_gift', { p_gift_id: giftId }));
  }
  async cancelReservation(giftId: string) {
    const sb = await this.c();
    check(await sb.rpc('cancel_reservation', { p_gift_id: giftId }));
  }
  async myReservations() {
    const sb = await this.c();
    const rows = check(await sb.rpc('my_reservations')) as unknown as string[] | null;
    return rows ?? [];
  }

  // ---------------------------------------------------------------- owner
  private row(input: GiftInput) {
    return {
      name: input.name,
      description: input.description,
      price: input.price,
      currency: input.currency,
      purchase_url: input.purchaseUrl,
      category_id: input.categoryId,
      priority: input.priority,
      is_favorite: input.isFavorite,
    };
  }

  async createGift(input: GiftInput, image: Blob[] | null) {
    const sb = await this.c();
    const created = check(await sb.from('gifts').insert(this.row(input)).select('id').single());
    if (image) {
      try {
        const folder = await this.upload(created.id, image);
        check(await sb.from('gifts').update({ image_path: folder }).eq('id', created.id));
      } catch {
        // Keep the gift; report the photo problem.
        throw new ApiError(
          'UNKNOWN',
          'El regalo se ha guardado, pero la foto no se pudo subir. Prueba otra vez desde «Editar».',
        );
      }
    }
    return (await this.getGift(created.id))!;
  }

  async updateGift(id: string, input: GiftInput, image: Blob[] | null | 'remove') {
    const sb = await this.c();
    const current = check(await sb.from('gifts').select('image_path').eq('id', id).maybeSingle());
    if (!current) throw new ApiError('GIFT_NOT_FOUND');
    let image_path: string | null | undefined;
    if (image === 'remove') image_path = null;
    else if (image) image_path = await this.upload(id, image);
    check(
      await sb
        .from('gifts')
        .update({ ...this.row(input), ...(image_path !== undefined ? { image_path } : {}) })
        .eq('id', id),
    );
    if (image_path !== undefined) await this.removeFolder(current.image_path);
    const g = await this.getGift(id);
    if (!g) throw new ApiError('GIFT_NOT_FOUND');
    return g;
  }

  async deleteGift(id: string) {
    const sb = await this.c();
    const current = check(await sb.from('gifts').select('image_path').eq('id', id).maybeSingle());
    check(await sb.from('gifts').delete().eq('id', id));
    await this.removeFolder(current?.image_path ?? null);
  }

  async releaseGift(id: string) {
    const sb = await this.c();
    check(await sb.rpc('release_gift', { p_gift_id: id }));
  }

  async saveCategory(c: { id?: string; name: string }): Promise<Category> {
    const sb = await this.c();
    const name = c.name.trim().slice(0, 40);
    if (c.id) {
      const r = check(
        await sb
          .from('categories')
          .update({ name })
          .eq('id', c.id)
          .select('id, name, slug, sort_order')
          .single(),
      );
      return { id: r.id, name: r.name, slug: r.slug, sortOrder: r.sort_order };
    }
    const existing = check(await sb.from('categories').select('slug, sort_order'));
    const taken = new Set(existing.map((x) => x.slug));
    let slug = slugify(name);
    for (let i = 2; taken.has(slug); i++) slug = `${slugify(name)}-${i}`;
    const sortOrder = existing.reduce((m, x) => Math.max(m, x.sort_order + 1), 0);
    const r = check(
      await sb
        .from('categories')
        .insert({ name, slug, sort_order: sortOrder })
        .select('id, name, slug, sort_order')
        .single(),
    );
    return { id: r.id, name: r.name, slug: r.slug, sortOrder: r.sort_order };
  }

  async deleteCategory(id: string) {
    const sb = await this.c();
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
    const sb = await this.c();
    await Promise.all(
      ids.map((id, i) => sb.from('categories').update({ sort_order: i }).eq('id', id).then(check)),
    );
  }

  async listInvitations(): Promise<Invitation[]> {
    const sb = await this.c();
    const rows = check(
      await sb
        .from('invitations')
        .select('id, email_restriction, expires_at, used_at, revoked_at, created_at')
        .eq('role', 'family')
        .order('created_at', { ascending: false }),
    );
    return rows.map((i) => ({
      id: i.id,
      emailRestriction: i.email_restriction,
      expiresAt: i.expires_at,
      usedAt: i.used_at,
      revokedAt: i.revoked_at,
      createdAt: i.created_at,
    }));
  }

  async createInvitation(email: string | null, days: number) {
    const sb = await this.c();
    return check(
      await sb.rpc('create_invitation', { p_email: email, p_days: days }),
    ) as unknown as string;
  }

  async revokeInvitation(id: string) {
    const sb = await this.c();
    check(
      await sb
        .from('invitations')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .is('used_at', null),
    );
  }

  async listFamily(): Promise<Profile[]> {
    const sb = await this.c();
    const rows = check(
      await sb
        .from('profiles')
        .select('id, email, display_name, role, created_at')
        .eq('role', 'family')
        .order('created_at'),
    );
    return rows.map((p) => ({
      id: p.id,
      email: p.email,
      displayName: p.display_name,
      role: p.role as Role,
      createdAt: p.created_at,
    }));
  }

  async removeFamilyMember(id: string) {
    const sb = await this.c();
    check(await sb.rpc('remove_family_member', { p_user_id: id }));
  }
}
