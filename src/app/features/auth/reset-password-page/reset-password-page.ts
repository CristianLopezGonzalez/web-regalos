import {
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormField, form, readonly, required, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { ApiError } from '@app/core/api/api-error';
import { errorMessage } from '@app/core/api/error-message';
import { Session } from '@app/core/auth/session';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { AuthField } from '../auth-field/auth-field';
import { AuthLayout, EnvelopeState } from '../auth-layout/auth-layout';
import { AuthLink } from '../auth-layout/auth-link';
import { passwordShortBy } from '../register-form/register-form';

type View = 'checking' | 'form' | 'unreachable' | 'expired';
const COPY: Record<View, { heading: string; lede: string | null; envelope: EnvelopeState }> = {
  checking: { heading: 'Un momento', lede: null, envelope: 'closed' },
  form: {
    heading: 'Elige tu contraseña',
    lede: 'La usarás a partir de ahora para entrar en la wishlist.',
    envelope: 'open',
  },
  unreachable: {
    heading: 'Sin conexión',
    lede: 'No hemos podido comprobar el enlace. Sigue sirviendo: vuelve a abrirlo desde el correo cuando tengas red.',
    envelope: 'closed',
  },
  expired: {
    heading: 'Enlace caducado',
    lede: 'Este enlace ya no es válido: puede que haya caducado o que ya se usara. Pide otro, tarda un momento.',
    envelope: 'void',
  },
};

/**
 * /reset-password: landing page of the recovery email. Supabase signs the person in from the
 * link; here they choose a new password.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [AuthLayout, AuthLink, AuthField, FormField],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  protected readonly session = inject(Session);
  private readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);
  private readonly injector = inject(Injector);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verifying = signal(false);
  /** The link could not be checked (no network): it is still unused, it can be opened again. */
  protected readonly unreachable = signal(false);
  protected readonly attempted = signal(false);
  protected readonly show = signal(false);

  protected readonly form = form(signal({ password: '' }), (p) => {
    required(p.password, { message: 'Elige una contraseña.' });
    validate(p.password, ({ value }) => {
      const n = value().length;
      return n && n < 8 ? { kind: 'minLength', message: passwordShortBy(n) } : undefined;
    });
    readonly(p.password, { when: () => this.busy() });
  });

  protected readonly view = computed<View>(() =>
    !this.session.ready() || this.verifying()
      ? 'checking'
      : this.session.signedIn()
        ? 'form'
        : this.unreachable()
          ? 'unreachable'
          : 'expired',
  );
  protected readonly copy = computed(() => COPY[this.view()]);
  private readonly layout = viewChild.required(AuthLayout);

  constructor() {
    // Email link: /reset-password?token_hash=…&type=recovery (template in Supabase → Auth → Emails).
    const q = new URLSearchParams(location.search);
    const tokenHash = q.get('token_hash');
    if (tokenHash && q.get('type') === 'recovery') {
      this.verifying.set(true);
      void this.api
        .verifyRecovery(tokenHash)
        .then(() => this.session.whenReady())
        .catch(() => this.unreachable.set(true)) // e.g. offline: no unhandled rejection
        .finally(() => {
          // The token is single-use: drop it from the address bar and history.
          void this.router.navigateByUrl('/reset-password', { replaceUrl: true });
          this.verifying.set(false);
        });
    }

    effect(() => {
      this.form.password().value();
      untracked(() => this.error.set(null));
    });

    let first = true;
    effect(() => {
      const v = this.view();
      if (v === 'checking') return;
      untracked(() => {
        const firstVisit = first;
        first = false;
        afterNextRender(() => this.layout().focusView({ firstVisit }), {
          injector: this.injector,
        });
      });
    });
  }

  protected async save(e: Event) {
    e.preventDefault();
    if (this.busy()) return;
    this.attempted.set(true);
    if (this.form.password().invalid()) return this.form.password().focusBoundControl();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return this.error.set(errorMessage(new ApiError('NETWORK')));
    }
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.api.updatePassword(this.form.password().value());
      this.toasts.success('Contraseña cambiada.');
      void this.router.navigateByUrl(this.session.isOwner() ? '/admin' : '/wishlist');
    } catch (err) {
      this.busy.set(false);
      this.error.set(errorMessage(err));
    }
  }
}
