import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/format';
import { Session } from '../../core/session';
import { Toasts } from '../../core/toast';
import { WishlistApi } from '../../core/wishlist-api';
import { AuthLayout } from './auth-layout';

/**
 * /reset-password: landing page of the recovery email. Supabase signs the person in from the
 * link; here they choose a new password.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [AuthLayout, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!session.ready() || verifying()) {
      <app-auth-layout heading="Un momento">
        <p class="m-0 text-[17px]" role="status">Comprobando el enlace…</p>
      </app-auth-layout>
    } @else if (session.signedIn()) {
      <app-auth-layout heading="Nueva contraseña" lede="Elige una contraseña nueva para tu cuenta.">
        <form class="grid gap-6" (submit)="$event.preventDefault(); save(pw.value)" novalidate>
          <div class="field">
            <label class="field-label" for="rp-pw">Contraseña nueva</label>
            <input #pw id="rp-pw" class="input" type="password" autocomplete="new-password" aria-describedby="rp-pw-msg" [attr.aria-invalid]="error() ? true : null" />
            @if (error()) {
              <p class="field-error" id="rp-pw-msg">{{ error() }}</p>
            } @else {
              <p class="field-hint" id="rp-pw-msg">Al menos 8 caracteres.</p>
            }
          </div>
          <button type="submit" class="btn btn-primary w-full" [disabled]="busy()">{{ busy() ? 'Guardando…' : 'Guardar contraseña' }}</button>
        </form>
      </app-auth-layout>
    } @else {
      <app-auth-layout heading="Enlace caducado">
        <div>
          <p class="m-0 text-[17px] leading-relaxed">Este enlace ya no es válido. Pide uno nuevo desde «¿Has olvidado tu contraseña?».</p>
          <a class="btn btn-outline mt-8" routerLink="/login">Ir a entrar</a>
        </div>
      </app-auth-layout>
    }
  `,
})
export class ResetPasswordPage {
  readonly session = inject(Session);
  private readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly verifying = signal(false);

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

  async save(password: string) {
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
