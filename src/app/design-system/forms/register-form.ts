import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../core/format';
import { WishlistApi } from '../../core/wishlist-api';
import { FormField } from './form-field';
import { EMAIL_PATTERN, errorFor } from './form-utils';

/**
 * Sign-up with an invitation token. The token is checked (and consumed) by the database in the
 * same transaction that creates the account; this form only gives early, friendly feedback.
 */
@Component({
  selector: 'app-register-form',
  imports: [ReactiveFormsModule, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form class="grid gap-6" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <app-form-field label="Tu nombre" forId="reg-name" hint="Así te verán los demás en la wishlist." [error]="err('displayName')">
        <input id="reg-name" class="input" formControlName="displayName" autocomplete="given-name" maxlength="60" aria-describedby="reg-name-msg" [attr.aria-invalid]="!!err('displayName')" />
      </app-form-field>
      <app-form-field label="Email" forId="reg-email" [error]="err('email')">
        <input id="reg-email" class="input" type="email" formControlName="email" autocomplete="email" inputmode="email" spellcheck="false" aria-describedby="reg-email-msg" [attr.aria-invalid]="!!err('email')" />
      </app-form-field>
      <app-form-field label="Contraseña" forId="reg-password" hint="Al menos 8 caracteres." [error]="err('password')">
        <div class="relative">
          <input id="reg-password" class="input pr-28" [type]="show() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" aria-describedby="reg-password-msg" [attr.aria-invalid]="!!err('password')" />
          <button type="button" class="input-reveal" (click)="show.set(!show())" [attr.aria-pressed]="show()">{{ show() ? 'Ocultar' : 'Mostrar' }}</button>
        </div>
      </app-form-field>

      @if (failure()) {
        <p class="form-alert" role="alert">{{ failure() }}</p>
      }

      <button type="submit" class="btn btn-primary w-full" [disabled]="busy()" [attr.aria-busy]="busy()">
        {{ busy() ? 'Creando tu cuenta…' : 'Crear mi cuenta' }}
      </button>
    </form>
  `,
})
export class RegisterForm {
  readonly token = input.required<string>();
  readonly registered = output<'signed-in' | 'confirm-email'>();
  private readonly api = inject(WishlistApi);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  readonly busy = signal(false);
  readonly show = signal(false);
  readonly submitted = signal(false);
  readonly failure = signal<string | null>(null);

  err(name: 'displayName' | 'email' | 'password') {
    return errorFor(this.form.controls[name], this.submitted(), {
      required: { displayName: 'Escribe tu nombre.', email: 'Escribe tu email.', password: 'Elige una contraseña.' }[name],
      pattern: 'Este email no parece completo (falta la @ o el dominio).',
      minlength: 'La contraseña necesita al menos 8 caracteres.',
      maxlength: 'Usa como mucho 60 caracteres.',
    });
  }

  async submit() {
    this.submitted.set(true);
    this.failure.set(null);
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      const v = this.form.getRawValue();
      const r = await this.api.signUp({ ...v, inviteToken: this.token() });
      this.registered.emit(r);
    } catch (e) {
      this.failure.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
