import { Component, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DEMO_ACCOUNTS, DEMO_INVITE_TOKEN } from '@app/core/demo/demo-data';
import { Session } from '@app/core/auth/session';
import { safeNext } from '@app/core/auth/safe-next';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { LoginForm } from '../login-form/login-form';
import { AuthLayout } from '../auth-layout/auth-layout';

@Component({
  selector: 'app-login-page',
  imports: [AuthLayout, LoginForm, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  protected readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly session = inject(Session);

  readonly next = input<string | null>(null);

  protected readonly accounts = DEMO_ACCOUNTS;
  protected readonly token = DEMO_INVITE_TOKEN;

  constructor() {
    effect(() => {
      if (this.session.signedIn()) this.go();
    });
  }

  go() {
    const fallback = this.session.isOwner() ? '/admin' : '/wishlist';
    void this.router.navigateByUrl(safeNext(this.next()) ?? fallback);
  }
}
