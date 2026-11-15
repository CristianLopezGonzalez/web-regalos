import { Component, inject, output, signal } from '@angular/core';
import { FormField, FormRoot, form, required, submit } from '@angular/forms/signals';
import { errorMessage } from '@app/core/api/error-message';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { LabeledField } from '@app/design-system/forms/labeled-field/labeled-field';
import { emailAddress } from '@app/design-system/forms/validators';

/** Email + password. A second mode asks for a reset link without revealing whether the email exists. */
@Component({
  selector: 'app-login-form',
  imports: [FormField, FormRoot, LabeledField],
  host: { class: 'block' },
  templateUrl: './login-form.html',
})
export class LoginForm {
  private readonly api = inject(WishlistApi);

  readonly signedIn = output<void>();

  protected readonly form = form(
    signal({ email: '', password: '' }),
    (p) => {
      required(p.email, { message: 'Escribe tu email.' });
      emailAddress(p.email);
      required(p.password, { message: 'Escribe tu contraseña.' });
    },
    { submission: { action: () => this.signIn() } },
  );
  protected readonly mode = signal<'login' | 'reset'>('login');
  protected readonly show = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly resetSent = signal(false);

  protected setMode(mode: 'login' | 'reset') {
    this.mode.set(mode);
    this.failure.set(null);
    this.resetSent.set(false);
  }

  private async signIn() {
    this.failure.set(null);
    try {
      const { email, password } = this.form().value();
      await this.api.signIn(email, password);
      this.signedIn.emit();
    } catch (e) {
      this.failure.set(errorMessage(e));
    }
  }

  /** Only the email has to be valid here, so only that field is submitted. */
  protected async sendReset() {
    this.failure.set(null);
    this.resetSent.set(false);
    await submit(this.form.email, async (email) => {
      try {
        await this.api.requestPasswordReset(email().value());
        this.resetSent.set(true);
      } catch (e) {
        this.failure.set(errorMessage(e));
      }
    });
  }
}
