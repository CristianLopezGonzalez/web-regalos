import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DEMO_ACCOUNTS, DEMO_INVITE_TOKEN } from '../../core/demo-data';
import { Session, safeNext } from '../../core/session';
import { WishlistApi } from '../../core/wishlist-api';
import { LoginForm } from '../../design-system/forms/login-form';
import { AuthLayout } from './auth-layout';

@Component({
  selector: 'app-login-page',
  imports: [AuthLayout, LoginForm, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout heading="Entrar" lede="La lista es privada: solo la ve la familia.">
      <div>
        <app-login-form />
        <p class="invite">¿Primera vez? Abre el enlace de invitación que te enviaron: te llevará a crear tu cuenta.</p>
        @if (api.isDemo) {
          <aside class="demo" aria-label="Cuentas de la demo">
            <p class="caps m-0">Modo demo</p>
            <dl>
              <dt>Dueña</dt>
              <dd>{{ accounts.owner.email }}</dd>
              <dt>Familia</dt>
              <dd>{{ accounts.family.email }}</dd>
              <dt>Contraseña</dt>
              <dd>{{ accounts.owner.password }}</dd>
            </dl>
            <p class="m-0">Invitación de prueba: <a routerLink="/register" [queryParams]="{ invite: token }">/register?invite={{ token }}</a></p>
          </aside>
        }
      </div>
    </app-auth-layout>
  `,
  styles: `
    .invite {
      margin: 32px 0 0;
      padding-top: 24px;
      border-top: 1px solid var(--color-line);
      font-size: 15px;
      line-height: 1.55;
      color: var(--color-ink-soft);
    }
    .demo {
      display: grid;
      gap: 12px;
      margin-top: 28px;
      padding: 18px 20px;
      border: 1px dashed var(--color-gold);
      font-size: 14px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 16px;
      margin: 0;
    }
    dt {
      color: var(--color-ink-soft);
    }
    dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class LoginPage {
  readonly next = input<string | null>(null);
  readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly session = inject(Session);
  readonly accounts = DEMO_ACCOUNTS;
  readonly token = DEMO_INVITE_TOKEN;

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
