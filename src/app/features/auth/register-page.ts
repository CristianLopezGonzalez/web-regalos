import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Toasts } from '../../core/toast';
import { WishlistApi } from '../../core/wishlist-api';
import { RegisterForm } from '../../design-system/forms/register-form';
import { AuthLayout } from './auth-layout';

type InviteState = 'checking' | 'valid' | 'invalid' | 'missing' | 'confirm-email';

/** /register?invite=<token>. Without a valid invitation there is no form at all. */
@Component({
  selector: 'app-register-page',
  imports: [AuthLayout, RegisterForm, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('checking') {
        <app-auth-layout heading="Un momento">
          <p class="lead" role="status">Comprobando tu invitación…</p>
        </app-auth-layout>
      }
      @case ('valid') {
        <app-auth-layout heading="Te damos la bienvenida" lede="Tienes una invitación. Crea tu cuenta para ver la wishlist y reservar regalos.">
          <app-register-form [token]="invite()!" (registered)="done($event)" />
        </app-auth-layout>
      }
      @case ('confirm-email') {
        <app-auth-layout heading="Revisa tu email">
          <p class="lead" role="status">Te hemos enviado un enlace para confirmar tu cuenta. Ábrelo y después entra con tu contraseña.</p>
        </app-auth-layout>
      }
      @default {
        <app-auth-layout heading="Hace falta una invitación">
          <div>
            <p class="lead">
              @if (state() === 'missing') {
                Para crear una cuenta necesitas el enlace de invitación que te enviaron.
              } @else {
                Esta invitación no es válida: puede que haya caducado, que ya se haya usado o que el enlace esté incompleto.
                Pide un enlace nuevo.
              }
            </p>
            <a class="btn btn-outline mt-8" routerLink="/login">Ya tengo cuenta</a>
          </div>
        </app-auth-layout>
      }
    }
  `,
  styles: `
    .lead {
      margin: 0;
      font-size: 17px;
      line-height: 1.6;
    }
  `,
})
export class RegisterPage {
  readonly invite = input<string | null>(null);
  private readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);
  readonly state = signal<InviteState>('checking');

  constructor() {
    effect(async () => {
      const token = this.invite()?.trim();
      if (!token) return this.state.set('missing');
      if (!/^[A-Za-z0-9-]{8,128}$/.test(token)) return this.state.set('invalid');
      this.state.set('checking');
      try {
        this.state.set((await this.api.checkInvitation(token)) === 'valid' ? 'valid' : 'invalid');
      } catch {
        this.state.set('invalid');
      }
    });
  }

  done(result: 'signed-in' | 'confirm-email') {
    if (result === 'confirm-email') return this.state.set('confirm-email');
    this.toasts.success('Tu cuenta está lista. Ya puedes ver la wishlist.');
    void this.router.navigateByUrl('/wishlist');
  }
}
