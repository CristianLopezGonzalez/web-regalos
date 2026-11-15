import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Toasts } from './core/toast/toasts';
import { OfflineBanner } from './design-system/feedback/offline-banner/offline-banner';
import { ToastOutlet } from './design-system/feedback/toast-outlet/toast-outlet';
import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, ToastOutlet, OfflineBanner],
  templateUrl: './app.html',
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

  protected skip(e: Event) {
    e.preventDefault();
    document.getElementById('main')?.focus();
  }
}
