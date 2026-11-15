import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength, minLength, required } from '@angular/forms/signals';
import { errorMessage } from '@app/core/api/error-message';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { LabeledField } from '@app/design-system/forms/labeled-field/labeled-field';
import { emailAddress } from '@app/design-system/forms/validators';

/**
 * Sign-up with an invitation token. The token is checked (and consumed) by the database in the
 * same transaction that creates the account; this form only gives early, friendly feedback.
 */
@Component({
  selector: 'app-register-form',
  imports: [FormField, FormRoot, LabeledField],
  host: { class: 'block' },
  templateUrl: './register-form.html',
})
export class RegisterForm {
  private readonly api = inject(WishlistApi);

  readonly token = input.required<string>();

  readonly registered = output<'signed-in' | 'confirm-email'>();

  protected readonly form = form(
    signal({ displayName: '', email: '', password: '' }),
    (p) => {
      required(p.displayName, { message: 'Escribe tu nombre.' });
      maxLength(p.displayName, 60, { message: 'Usa como mucho 60 caracteres.' });
      required(p.email, { message: 'Escribe tu email.' });
      emailAddress(p.email);
      required(p.password, { message: 'Elige una contraseña.' });
      minLength(p.password, 8, { message: 'La contraseña necesita al menos 8 caracteres.' });
    },
    { submission: { action: () => this.signUp() } },
  );
  protected readonly show = signal(false);
  protected readonly failure = signal<string | null>(null);

  private async signUp() {
    this.failure.set(null);
    try {
      const r = await this.api.signUp({ ...this.form().value(), inviteToken: this.token() });
      this.registered.emit(r);
    } catch (e) {
      this.failure.set(errorMessage(e));
    }
  }
}
