import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Session } from './session';

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
  return router.createUrlTree(
    p ? ['/wishlist'] : ['/login'],
    p ? {} : { queryParams: { next: '/admin' } },
  );
};

/** /admin: whoever has a list of their own. The owner-only sections add ownerGuard on top. */
export const listGuard: CanMatchFn = async () => {
  const session = inject(Session);
  const router = inject(Router);
  const p = await session.whenReady();
  if (p?.hasList) return true;
  return router.createUrlTree(
    p ? ['/wishlist'] : ['/login'],
    p ? {} : { queryParams: { next: '/admin' } },
  );
};

/** "Nuestros regalos": only the two planners. */
export const plannerGuard: CanMatchFn = async (_route, segments) => {
  const session = inject(Session);
  const router = inject(Router);
  const p = await session.whenReady();
  if (p?.isPlanner) return true;
  const next = '/' + segments.map((s) => s.path).join('/');
  return router.createUrlTree(p ? ['/wishlist'] : ['/login'], p ? {} : { queryParams: { next } });
};

export const guestGuard: CanMatchFn = async () => {
  const session = inject(Session);
  const router = inject(Router);
  const p = await session.whenReady();
  return p ? router.createUrlTree([p.role === 'owner' ? '/admin' : '/wishlist']) : true;
};
