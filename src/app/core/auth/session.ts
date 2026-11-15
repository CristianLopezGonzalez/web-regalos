import { Injectable, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import { WishlistApi } from '../api/wishlist-api';

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
  /** Sees "Nuestros regalos" (the presents we plan to give). */
  readonly isPlanner = computed(() => !!this.profile()?.isPlanner);

  private readonly profile$ = toObservable(this.profile);

  /** Resolves once the stored session has been restored (immediately if it already is). */
  whenReady() {
    const now = this.profile();
    if (now !== undefined) return Promise.resolve(now);
    return firstValueFrom(this.profile$.pipe(filter((p) => p !== undefined)));
  }
}
