import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Toasts } from './core/toast';
import { OfflineBanner } from './design-system/feedback/offline-banner';
import { ToastOutlet } from './design-system/feedback/toast-outlet';
import { SiteFooter } from './design-system/layout/site-footer';
import { SiteHeader } from './design-system/layout/site-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, ToastOutlet, OfflineBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main" (click)="skip($event)">Saltar al contenido</a>
    <app-site-header />
    <main id="main" tabindex="-1" class="block min-h-[calc(100svh-64px)] outline-none">
      <router-outlet />
    </main>
    <app-site-footer />
    <app-toast-outlet />
    <app-offline-banner />
  `,
})
export class App {
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  constructor() {
    // Supabase sends people back with ?error_code=… (and in the #hash) when an email link fails.
    const params = new URLSearchParams(location.search + '&' + location.hash.replace(/^#/, ''));
    const code = params.get('error_code');
    if (code) {
      this.toasts.error(
        code === 'otp_expired'
          ? 'El enlace del correo ha caducado o ya se usó. Pide uno nuevo desde «¿Has olvidado tu contraseña?».'
          : 'No se pudo usar el enlace del correo. Pide uno nuevo.',
      );
      void this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  skip(e: Event) {
    e.preventDefault();
    document.getElementById('main')?.focus();
  }
}
