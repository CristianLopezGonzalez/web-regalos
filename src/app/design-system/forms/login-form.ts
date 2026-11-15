import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../core/format';
import { WishlistApi } from '../../core/wishlist-api';
import { FormField } from './form-field';
import { EMAIL_PATTERN, errorFor } from './form-utils';

/** Email + password. A second mode asks for a reset link without revealing whether the email exists. */
@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (mode() === 'login') {
      <form class="grid gap-6" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <app-form-field label="Email" forId="login-email" [error]="err('email')">
          <input id="login-email" class="input" type="email" formControlName="email" autocomplete="email" inputmode="email" spellcheck="false" aria-describedby="login-email-msg" [attr.aria-invalid]="!!err('email')" />
        </app-form-field>
        <app-form-field label="Contraseña" forId="login-password" [error]="err('password')">
          <div class="relative">
            <input id="login-password" class="input pr-28" [type]="show() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" aria-describedby="login-password-msg" [attr.aria-invalid]="!!err('password')" />
            <button type="button" class="input-reveal" (click)="show.set(!show())" [attr.aria-pressed]="show()">{{ show() ? 'Ocultar' : 'Mostrar' }}</button>
          </div>
        </app-form-field>

        @if (failure()) {
          <p class="form-alert" role="alert">{{ failure() }}</p>
        }

        <button type="submit" class="btn btn-primary w-full" [disabled]="busy()" [attr.aria-busy]="busy()">
          {{ busy() ? 'Entrando…' : 'Entrar' }}
        </button>
        <button type="button" class="btn btn-ghost justify-self-center" (click)="mode.set('reset'); failure.set(null)">¿Has olvidado tu contraseña?</button>
      </form>
    } @else {
      <form class="grid gap-6" (ngSubmit)="sendReset()" novalidate>
        <p class="m-0 text-[17px] leading-relaxed">Escribe tu email y te enviaremos un enlace para crear una contraseña nueva.</p>
        <app-form-field label="Email" forId="reset-email" [error]="err('email')">
          <input id="reset-email" class="input" type="email" [formControl]="form.controls.email" autocomplete="email" spellcheck="false" aria-describedby="reset-email-msg" />
        </app-form-field>
        @if (resetSent()) {
          <p class="form-note" role="status">Si existe una cuenta con ese email, te hemos enviado el enlace. Revisa también el correo no deseado.</p>
        }
        <button type="submit" class="btn btn-primary w-full" [disabled]="busy()">{{ busy() ? 'Enviando…' : 'Enviar enlace' }}</button>
        <button type="button" class="btn btn-ghost justify-self-center" (click)="mode.set('login'); resetSent.set(false)">Volver a entrar</button>
      </form>
    }
  `,
})
export class LoginForm {
  private readonly api = inject(WishlistApi);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly signedIn = output<void>();

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    password: ['', Validators.required],
  });
  readonly mode = signal<'login' | 'reset'>('login');
  readonly busy = signal(false);
  readonly show = signal(false);
  readonly submitted = signal(false);
  readonly failure = signal<string | null>(null);
  readonly resetSent = signal(false);

  err(name: 'email' | 'password') {
    return errorFor(this.form.controls[name], this.submitted(), {
      required: name === 'email' ? 'Escribe tu email.' : 'Escribe tu contraseña.',
      pattern: 'Este email no parece completo (falta la @ o el dominio).',
    });
  }

  async submit() {
    this.submitted.set(true);
    this.failure.set(null);
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.api.signIn(email, password);
      this.signedIn.emit();
    } catch (e) {
      this.failure.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  async sendReset() {
    this.submitted.set(true);
    if (this.form.controls.email.invalid) return;
    this.busy.set(true);
    try {
      await this.api.requestPasswordReset(this.form.controls.email.value);
    } finally {
      this.busy.set(false);
      this.resetSent.set(true);
    }
  }
}
