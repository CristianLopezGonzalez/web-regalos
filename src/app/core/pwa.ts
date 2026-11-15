import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Installed-app plumbing: connection state for the offline banner, and silent updates.
 * The service worker only caches the app shell (ngsw-config.json); Supabase data always goes to the network.
 */
@Injectable({ providedIn: 'root' })
export class Pwa {
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  private readonly sw = inject(SwUpdate);
  private readonly router = inject(Router);
  private updateReady = false;

  constructor() {
    const setOnline = () => this.online.set(true);
    const setOffline = () => this.online.set(false);
    addEventListener('online', setOnline);
    addEventListener('offline', setOffline);
    inject(DestroyRef).onDestroy(() => {
      removeEventListener('online', setOnline);
      removeEventListener('offline', setOffline);
    });

    if (!this.sw.isEnabled) return;

    // A new version was downloaded in the background: swap it in on the next page change,
    // so nobody loses what they were typing.
    this.sw.versionUpdates.pipe(filter((e) => e.type === 'VERSION_READY')).subscribe(() => (this.updateReady = true));
    this.router.events.pipe(filter((e) => e instanceof NavigationStart)).subscribe((e) => {
      if (this.updateReady) location.assign(e.url);
    });
    // The cached version is broken (e.g. files deleted on the server): start fresh.
    this.sw.unrecoverable.subscribe(() => location.reload());

    // Installed apps can stay open for days: look for updates when coming back to them.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) this.sw.checkForUpdate().catch(() => {});
    });
  }
}
