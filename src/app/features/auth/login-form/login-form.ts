import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormField, form, readonly, required } from '@angular/forms/signals';
import { ApiError } from '@app/core/api/api-error';
import { errorMessage } from '@app/core/api/error-message';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { emailAddress } from '@app/design-system/forms/validators';
import { AuthField } from '../auth-field/auth-field';
import { AuthStage } from '../auth-layout/auth-stage';

/** Seconds the "send link" button rests after sending: no bursts against the email rate limit. */
export const RESEND_COOLDOWN_S = 30;

/**
 * Email + password, and (mode 'reset') the request for a reset link, which never reveals whether
 * the email exists. Both modes share the email the person has typed.
 *
 * While a request is running the button keeps its focus and size (aria-disabled, not disabled):
 * a second press is ignored by logic. After wrong credentials the password is focused and
 * selected, ready to be typed again; an invalid send focuses the first field with an error.
 */
@Component({
  selector: 'app-login-form',
  imports: [FormField, AuthField],
  host: { class: 'block' },
  templateUrl: './login-form.html',
})
export class LoginForm {
  private readonly api = inject(WishlistApi);
  private readonly stage = inject(AuthStage);

  readonly mode = input<'login' | 'reset'>('login');
  readonly signedIn = output<void>();

  protected readonly busy = signal(false);
  protected readonly form = form(
    signal({ email: this.stage.takeEmail() ?? '', password: '' }),
    (p) => {
      required(p.email, { message: 'Escribe tu email.' });
      emailAddress(p.email);
      required(p.password, { message: 'Escribe tu contraseña.' });
      readonly(p.email, { when: () => this.busy() });
      readonly(p.password, { when: () => this.busy() });
    },
  );
  protected readonly show = signal(false);
  /** Each mode reproaches "empty" only after its own first send. */
  protected readonly attempted = signal(false);
  protected readonly resetAttempted = signal(false);
  protected readonly failure = signal<string | null>(null);
  /** Email the reset link was sent to (shown in the note). */
  protected readonly sentTo = signal<string | null>(null);
  protected readonly cooldown = signal(0);

  private readonly password = viewChild<ElementRef<HTMLInputElement>>('pw');
  private tick: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.tick));
    // Editing anything clears the server's message: it talked about what was there before.
    effect(() => {
      this.form.email().value();
      this.form.password().value();
      this.mode();
      untracked(() => this.failure.set(null));
    });
  }

  /** Enter on the email with no password yet: go to the password, don't reproach it. */
  protected nextField(e: Event) {
    if (this.mode() !== 'login' || this.form.password().value()) return;
    e.preventDefault();
    this.form.password().focusBoundControl();
  }

  protected async signIn(e: Event) {
    e.preventDefault();
    if (this.busy()) return;
    this.attempted.set(true);
    const first = [this.form.email, this.form.password].find((f) => f().invalid());
    if (first) return first().focusBoundControl();
    if (this.offline()) return;

    this.failure.set(null);
    this.busy.set(true);
    try {
      const { email, password } = this.form().value();
      await this.api.signIn(email, password);
      this.signedIn.emit(); // stays "Entrando…" until the page leaves
    } catch (err) {
      this.busy.set(false);
      this.failure.set(errorMessage(err));
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
        const pw = this.password()?.nativeElement;
        pw?.focus();
        pw?.select();
      }
    }
  }

  protected async sendReset(e: Event) {
    e.preventDefault();
    if (this.busy() || this.cooldown() > 0) return;
    this.resetAttempted.set(true);
    if (this.form.email().invalid()) return this.form.email().focusBoundControl();
    if (this.offline()) return;

    this.failure.set(null);
    this.busy.set(true);
    const email = this.form.email().value().trim();
    try {
      await this.api.requestPasswordReset(email);
      this.sentTo.set(email);
      this.startCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      this.failure.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected resetLabel() {
    if (this.busy()) return 'Enviando…';
    if (this.cooldown() > 0) return `Enviar otra vez en ${this.cooldown()} s`;
    return this.sentTo() ? 'Enviar otra vez' : 'Enviar enlace';
  }

  private offline() {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) return false;
    this.failure.set(errorMessage(new ApiError('NETWORK')));
    return true;
  }

  private startCooldown(seconds: number) {
    clearInterval(this.tick);
    this.cooldown.set(seconds);
    this.tick = setInterval(() => {
      this.cooldown.update((s) => s - 1);
      if (this.cooldown() <= 0) clearInterval(this.tick);
    }, 1000);
  }
}
