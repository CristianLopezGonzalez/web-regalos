import { Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { RegisterForm } from '../register-form/register-form';
import { AuthLayout } from '../auth-layout/auth-layout';

type InviteState = 'checking' | 'valid' | 'invalid' | 'missing' | 'confirm-email';

/** /register?invite=<token>. Without a valid invitation there is no form at all. */
@Component({
  selector: 'app-register-page',
  imports: [AuthLayout, RegisterForm, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPage {
  private readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  readonly invite = input<string | null>(null);

  protected readonly state = signal<InviteState>('checking');

  constructor() {
    effect(async () => {
      const token = this.invite()?.trim();
      if (!token) return this.state.set('missing');
      if (!/^[A-Za-z0-9-]{8,128}$/.test(token)) return this.state.set('invalid');
      this.state.set('checking');
      try {
        this.state.set((await this.api.checkInvitation(token)) === 'valid' ? 'valid' : 'invalid');
      } catch {
        this.state.set('invalid');
      }
    });
  }

  protected done(result: 'signed-in' | 'confirm-email') {
    if (result === 'confirm-email') return this.state.set('confirm-email');
    this.toasts.success('Tu cuenta está lista. Ya puedes ver la wishlist.');
    void this.router.navigateByUrl('/wishlist');
  }
}
