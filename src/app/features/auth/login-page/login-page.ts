import {
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Params, Router } from '@angular/router';
import { DEMO_ACCOUNTS, DEMO_INVITE_TOKEN } from '@app/core/demo/demo-data';
import { Session } from '@app/core/auth/session';
import { safeNext } from '@app/core/auth/safe-next';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { LoginForm } from '../login-form/login-form';
import { AuthLayout } from '../auth-layout/auth-layout';
import { AuthLink } from '../auth-layout/auth-link';

/**
 * /login and /login?mode=reset ("¿Has olvidado tu contraseña?"): two views of one letter, each
 * with its own title and h1, linkable and reachable with the browser's back button.
 */
@Component({
  selector: 'app-login-page',
  imports: [AuthLayout, LoginForm, AuthLink],
  templateUrl: './login-page.html',
})
export class LoginPage {
  protected readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly session = inject(Session);
  private readonly title = inject(Title);
  private readonly injector = inject(Injector);

  readonly next = input<string | null>(null);
  readonly mode = input<string | null>(null);

  protected readonly view = computed(() => (this.mode() === 'reset' ? 'reset' : 'login'));
  protected readonly accounts = DEMO_ACCOUNTS;
  protected readonly inviteUrl = `/register?invite=${DEMO_INVITE_TOKEN}`;

  protected readonly resetUrl = computed(() => this.url('/login', { mode: 'reset' }));
  protected readonly loginUrl = computed(() => this.url('/login', {}));
  protected readonly registerUrl = '/register';

  private readonly layout = viewChild.required(AuthLayout);

  constructor() {
    effect(() => {
      if (this.session.signedIn()) this.go();
    });
    let first = true;
    effect(() => {
      const view = this.view();
      untracked(() => {
        // After render: the new view exists, and the title wins over the route's static one.
        const firstVisit = first;
        afterNextRender(
          () => {
            this.title.setTitle(
              `${view === 'reset' ? 'Nueva contraseña' : 'Entrar'} · My Christmas Wishlist`,
            );
            this.layout().focusView({ firstVisit });
          },
          { injector: this.injector },
        );
        first = false;
      });
    });
  }

  go() {
    const fallback = this.session.isOwner() ? '/admin' : '/wishlist';
    void this.router.navigateByUrl(safeNext(this.next()) ?? fallback);
  }

  /** Same path, keeping ?next= so the person still lands where they were going. */
  private url(path: string, query: Params) {
    const next = this.next();
    const queryParams = next ? { ...query, next } : query;
    return this.router.serializeUrl(this.router.createUrlTree([path], { queryParams }));
  }
}
