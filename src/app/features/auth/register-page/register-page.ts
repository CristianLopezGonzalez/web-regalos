import {
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormField, form, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { ApiError } from '@app/core/api/api-error';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { RegisterForm } from '../register-form/register-form';
import { AuthField } from '../auth-field/auth-field';
import { AuthLayout, EnvelopeState } from '../auth-layout/auth-layout';
import { AuthLink } from '../auth-layout/auth-link';
import { AuthStage } from '../auth-layout/auth-stage';

type InviteState = 'checking' | 'valid' | 'invalid' | 'missing' | 'offline' | 'confirm-email';

const TOKEN = /^[A-Za-z0-9-]{8,128}$/;

/** The token from a pasted invitation link (…/register?invite=…) or a bare token; null if none. */
export function inviteTokenFrom(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/[?&]invite=([^&#\s]+)/);
  const token = m ? decodeURIComponent(m[1]) : s;
  return TOKEN.test(token) ? token : null;
}

interface View {
  heading: string;
  lede: string | null;
  envelope: EnvelopeState;
}

/*
  The backend says only valid | invalid | email_mismatch (check_invitation), so an expired, used,
  revoked or mistyped link share one honest message that covers each case and both ways out.
  The seal shows a neutral "W" until the invitation can say who sends it.
*/
const VIEWS: Record<InviteState, View> = {
  checking: { heading: 'Un momento', lede: null, envelope: 'closed' },
  valid: {
    heading: 'Tienes una invitación',
    lede: 'Crea tu cuenta para ver la wishlist y reservar regalos sin que nadie sepa cuál.',
    envelope: 'open',
  },
  invalid: {
    heading: 'Esta invitación no se puede abrir',
    lede: 'Puede que haya caducado, que ya se usara para crear una cuenta o que el enlace llegara incompleto.',
    envelope: 'void',
  },
  missing: {
    heading: 'Abre tu invitación',
    lede: 'Aquí se entra con el enlace de invitación que te enviaron por mensaje o por email.',
    envelope: 'closed',
  },
  offline: {
    heading: 'Sin conexión',
    lede: 'No hemos podido comprobar tu invitación. Revisa tu red e inténtalo otra vez.',
    envelope: 'closed',
  },
  'confirm-email': {
    heading: 'Revisa tu email',
    lede: null,
    envelope: 'stamped',
  },
};

/** /register?invite=<token>. Without a valid invitation there is no sign-up form at all. */
@Component({
  selector: 'app-register-page',
  imports: [AuthLayout, RegisterForm, AuthLink, AuthField, FormField],
  templateUrl: './register-page.html',
})
export class RegisterPage {
  private readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);
  private readonly stage = inject(AuthStage);
  private readonly injector = inject(Injector);

  readonly invite = input<string | null>(null);

  protected readonly state = signal<InviteState>('checking');
  protected readonly view = computed(() => VIEWS[this.state()]);
  private readonly retries = signal(0);
  private readonly layout = viewChild.required(AuthLayout);

  /** "Abre tu invitación": paste the link if it can't be opened from the message. */
  protected readonly pasteAttempted = signal(false);
  protected readonly paste = form(signal({ link: '' }), (p) => {
    validate(p.link, ({ value }) =>
      inviteTokenFrom(value())
        ? undefined
        : {
            kind: value().trim() ? 'invite' : 'required',
            message: value().trim()
              ? 'Ese enlace no parece una invitación: pega el enlace completo.'
              : 'Pega aquí el enlace de tu invitación.',
          },
    );
  });

  constructor() {
    let seq = 0;
    effect(async () => {
      const token = this.invite()?.trim();
      this.retries();
      const mine = ++seq;
      if (!token) return this.state.set('missing');
      if (!TOKEN.test(token)) return this.state.set('invalid');
      this.state.set('checking');
      let next: InviteState;
      try {
        next = (await this.api.checkInvitation(token)) === 'valid' ? 'valid' : 'invalid';
      } catch (e) {
        const offline =
          (e instanceof ApiError && e.code === 'NETWORK') ||
          (typeof navigator !== 'undefined' && navigator.onLine === false);
        next = offline ? 'offline' : 'invalid';
      }
      if (mine === seq) this.state.set(next); // a newer link (pasted, retried) wins
    });

    // Each new state: announce it (focus) once it has rendered. "checking" is transient.
    let first = true;
    effect(() => {
      const s = this.state();
      if (s === 'checking') return;
      untracked(() => {
        const firstVisit = first;
        first = false;
        afterNextRender(() => this.layout().focusView({ firstVisit }), {
          injector: this.injector,
        });
      });
    });
  }

  protected retry() {
    this.retries.update((n) => n + 1);
  }

  protected openPasted(e: Event) {
    e.preventDefault();
    this.pasteAttempted.set(true);
    const token = inviteTokenFrom(this.paste.link().value());
    if (!token) return this.paste.link().focusBoundControl();
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/register'], { queryParams: { invite: token } }),
    );
    this.stage.go(() => this.router.navigateByUrl(url));
  }

  protected invitationGone() {
    this.state.set('invalid');
  }

  protected done(result: 'signed-in' | 'confirm-email') {
    if (result === 'confirm-email') return this.state.set('confirm-email');
    this.toasts.success('Tu cuenta está lista. Ya puedes ver la wishlist.');
    void this.router.navigateByUrl('/wishlist');
  }
}
