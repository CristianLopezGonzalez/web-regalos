import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Chrome's install event (not in the TS DOM lib). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
type WindowWithPrompt = Window & { __installPrompt?: InstallPromptEvent };

/**
 * Installed-app plumbing: connection state for the offline banner, silent updates, and the
 * "Instalar app" button. The service worker only caches the app shell (ngsw-config.json);
 * Supabase data always goes to the network.
 */
@Injectable({ providedIn: 'root' })
export class Pwa {
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  /** Running as the installed app (home-screen icon), not in a browser tab. */
  private readonly mq = typeof matchMedia === 'function' ? matchMedia('(display-mode: standalone)') : null;
  readonly standalone = signal(!!this.mq?.matches || (navigator as { standalone?: boolean }).standalone === true);
  /** iPhone/iPad: Safari has no install prompt, only Share → "Añadir a pantalla de inicio". */
  readonly ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  private readonly prompt = signal<InstallPromptEvent | null>((window as WindowWithPrompt).__installPrompt ?? null);
  private readonly installed = signal(false);
  /** Show the "Instalar app" button: not installed yet, and this browser can install it (or it's iOS). */
  readonly canInstall = computed(() => !this.standalone() && !this.installed() && (!!this.prompt() || this.ios));

  private readonly sw = inject(SwUpdate);
  private readonly router = inject(Router);
  private updateReady = false;

  constructor() {
    const setOnline = () => this.online.set(true);
    const setOffline = () => this.online.set(false);
    const onPrompt = (e: Event) => this.prompt.set(e as InstallPromptEvent);
    const onInstalled = () => {
      this.installed.set(true);
      this.prompt.set(null);
    };
    const onMode = () => this.standalone.set(!!this.mq?.matches);
    addEventListener('online', setOnline);
    addEventListener('offline', setOffline);
    addEventListener('beforeinstallprompt', onPrompt);
    addEventListener('appinstalled', onInstalled);
    this.mq?.addEventListener('change', onMode);
    inject(DestroyRef).onDestroy(() => {
      removeEventListener('online', setOnline);
      removeEventListener('offline', setOffline);
      removeEventListener('beforeinstallprompt', onPrompt);
      removeEventListener('appinstalled', onInstalled);
      this.mq?.removeEventListener('change', onMode);
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

  /**
   * Opens the browser's install dialog when it offers one.
   * Returns 'instructions' when the person has to do it by hand (iOS, or the prompt is gone).
   */
  async install(): Promise<'accepted' | 'dismissed' | 'instructions'> {
    const p = this.prompt();
    if (!p) return 'instructions';
    this.prompt.set(null); // the event can only be used once
    try {
      await p.prompt();
      const { outcome } = await p.userChoice;
      if (outcome === 'accepted') this.installed.set(true);
      return outcome;
    } catch {
      return 'instructions';
    }
  }
}
