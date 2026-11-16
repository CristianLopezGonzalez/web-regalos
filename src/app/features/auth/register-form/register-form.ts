import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormField, form, maxLength, readonly, required, validate } from '@angular/forms/signals';
import { ApiError } from '@app/core/api/api-error';
import { errorMessage } from '@app/core/api/error-message';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { emailAddress } from '@app/design-system/forms/validators';
import { AuthField } from '../auth-field/auth-field';
import { AuthLink } from '../auth-layout/auth-link';
import { AuthStage } from '../auth-layout/auth-stage';

const MIN_PASSWORD = 8;

/** "Le faltan 3 caracteres para llegar a 8." — counts down while typing. */
export function passwordShortBy(length: number) {
  const left = MIN_PASSWORD - length;
  return `Le ${left === 1 ? 'falta 1 carácter' : `faltan ${left} caracteres`} para llegar a ${MIN_PASSWORD}.`;
}

/**
 * Sign-up with an invitation token. The token is checked (and consumed) by the database in the
 * same transaction that creates the account; this form only gives early, friendly feedback.
 */
@Component({
  selector: 'app-register-form',
  imports: [FormField, AuthField, AuthLink],
  host: { class: 'block' },
  templateUrl: './register-form.html',
})
export class RegisterForm {
  private readonly api = inject(WishlistApi);
  private readonly stage = inject(AuthStage);

  readonly token = input.required<string>();

  readonly registered = output<'signed-in' | 'confirm-email'>();
  /** The invitation stopped being valid between opening the link and sending the form. */
  readonly invitationGone = output<void>();

  protected readonly busy = signal(false);
  protected readonly form = form(
    signal({ displayName: '', email: '', password: '' }),
    (p) => {
      required(p.displayName, { message: 'Escribe tu nombre.' });
      maxLength(p.displayName, 60, { message: 'Usa como mucho 60 caracteres.' });
      required(p.email, { message: 'Escribe tu email.' });
      emailAddress(p.email);
      required(p.password, { message: 'Elige una contraseña.' });
      validate(p.password, ({ value }) => {
        const n = value().length;
        return n && n < MIN_PASSWORD ? { kind: 'minLength', message: passwordShortBy(n) } : undefined;
      });
      readonly(p.displayName, { when: () => this.busy() });
      readonly(p.email, { when: () => this.busy() });
      readonly(p.password, { when: () => this.busy() });
    },
  );
  protected readonly show = signal(false);
  protected readonly attempted = signal(false);
  protected readonly failure = signal<string | null>(null);
  /** The email is already registered: offer to sign in with it. */
  protected readonly taken = signal(false);
  /** Invitation restricted to another email: shown on the email field itself. */
  protected readonly emailError = signal<string | null>(null);

  private readonly fields = [this.form.displayName, this.form.email, this.form.password];

  constructor() {
    effect(() => {
      this.form().value();
      untracked(() => {
        this.failure.set(null);
        this.taken.set(false);
      });
    });
    effect(() => {
      this.form.email().value();
      untracked(() => this.emailError.set(null));
    });
  }

  /** Enter moves on to the next empty field instead of reproaching the ones not reached yet. */
  protected nextField(e: Event, index: number) {
    const next = this.fields.slice(index + 1).find((f) => !f().value());
    if (!next) return;
    e.preventDefault();
    next().focusBoundControl();
  }

  protected rememberEmail() {
    this.stage.rememberEmail(this.form.email().value());
  }

  protected async signUp(e: Event) {
    e.preventDefault();
    if (this.busy()) return;
    this.attempted.set(true);
    const first = this.fields.find((f) => f().invalid());
    if (first) return first().focusBoundControl();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return this.failure.set(errorMessage(new ApiError('NETWORK')));
    }

    this.failure.set(null);
    this.busy.set(true);
    try {
      const r = await this.api.signUp({ ...this.form().value(), inviteToken: this.token() });
      this.registered.emit(r); // stays busy until the page moves on
    } catch (err) {
      this.busy.set(false);
      const code = err instanceof ApiError ? err.code : null;
      if (code === 'INVITATION_INVALID') return this.invitationGone.emit();
      if (code === 'INVITATION_EMAIL_MISMATCH') {
        this.emailError.set(errorMessage(err));
        return this.form.email().focusBoundControl();
      }
      this.taken.set(code === 'EMAIL_TAKEN');
      this.failure.set(code === 'EMAIL_TAKEN' ? 'Ya hay una cuenta con este email.' : errorMessage(err));
    }
  }
}
