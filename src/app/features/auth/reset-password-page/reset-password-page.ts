import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '@app/core/api/error-message';
import { Session } from '@app/core/auth/session';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { AuthLayout } from '../auth-layout/auth-layout';

/**
 * /reset-password: landing page of the recovery email. Supabase signs the person in from the
 * link; here they choose a new password.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [AuthLayout, RouterLink],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  protected readonly session = inject(Session);
  private readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verifying = signal(false);

  constructor() {
    // Email link: /reset-password?token_hash=…&type=recovery (template in Supabase → Auth → Emails).
    const q = new URLSearchParams(location.search);
    const tokenHash = q.get('token_hash');
    if (tokenHash && q.get('type') === 'recovery') {
      this.verifying.set(true);
      void this.api
        .verifyRecovery(tokenHash)
        .then(() => this.session.whenReady())
        .finally(() => {
          // The token is single-use: drop it from the address bar and history.
          void this.router.navigateByUrl('/reset-password', { replaceUrl: true });
          this.verifying.set(false);
        });
    }
  }

  protected async save(password: string) {
    if (password.length < 8) return this.error.set('La contraseña necesita al menos 8 caracteres.');
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.api.updatePassword(password);
      this.toasts.success('Contraseña cambiada.');
      void this.router.navigateByUrl(this.session.isOwner() ? '/admin' : '/wishlist');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
