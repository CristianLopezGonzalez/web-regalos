import { Injectable, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanMatchFn, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { WishlistApi } from './wishlist-api';

/** Read-only view of who is signed in. UX only: the database is the real gatekeeper. */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly api = inject(WishlistApi);
  readonly profile = this.api.profile;
  readonly ready = computed(() => this.profile() !== undefined);
  readonly signedIn = computed(() => !!this.profile());
  readonly isOwner = computed(() => this.profile()?.role === 'owner');
  readonly isFamily = computed(() => this.profile()?.role === 'family');
  /** Has a wish list of their own (the owner, Angela): can open /admin to manage their gifts. */
  readonly hasList = computed(() => !!this.profile()?.hasList);

  private readonly profile$ = toObservable(this.profile);
  /** Resolves once the stored session has been restored (immediately if it already is). */
  whenReady() {
    const now = this.profile();
    if (now !== undefined) return Promise.resolve(now);
    return firstValueFrom(this.profile$.pipe(filter((p) => p !== undefined)));
  }
}

/** Route guards. They only spare people a dead end; RLS still refuses anything not allowed. */
export const signedInGuard: CanMatchFn = async (_route, segments) => {
  const session = inject(Session);
  const router = inject(Router);
  const p = await session.whenReady();
  if (p) return true;
  const next = '/' + segments.map((s) => s.path).join('/');
  return router.createUrlTree(['/login'], { queryParams: next !== '/' ? { next } : {} });
};

export const ownerGuard: CanMatchFn = async () => {
  const session = inject(Session);
  const router = inject(Router);
  const p = await session.whenReady();
  if (p?.role === 'owner') return true;
  return router.createUrlTree(p ? ['/wishlist'] : ['/login'], p ? {} : { queryParams: { next: '/admin' } });
};

/** /admin: whoever has a list of their own. The owner-only sections add ownerGuard on top. */
export const listGuard: CanMatchFn = async () => {
  const session = inject(Session);
  const router = inject(Router);
  const p = await session.whenReady();
  if (p?.hasList) return true;
  return router.createUrlTree(p ? ['/wishlist'] : ['/login'], p ? {} : { queryParams: { next: '/admin' } });
};

export const guestGuard: CanMatchFn = async () => {
  const session = inject(Session);
  const router = inject(Router);
  const p = await session.whenReady();
  return p ? router.createUrlTree([p.role === 'owner' ? '/admin' : '/wishlist']) : true;
};

/** Only same-site paths are accepted as a post-login destination (no open redirects). */
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
