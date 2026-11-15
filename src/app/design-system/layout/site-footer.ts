import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DEMO_PHOTO_CREDITS } from '../../core/demo-data';
import { Session } from '../../core/session';
import { Toasts } from '../../core/toast';
import { WishlistApi } from '../../core/wishlist-api';

/** The street at night: the name large in Italiana, the promise of anonymity, the exits. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="sf">
      <div class="wrap">
        <p class="sf-mark" lang="en">My Christmas Wishlist</p>
        <div class="sf-row">
          <ul role="list">
            @if (session.signedIn()) {
              <li><a routerLink="/wishlist">Wishlist</a></li>
              <li><a routerLink="/profile">Perfil</a></li>
              @if (session.isOwner()) {
                <li><a routerLink="/admin">Admin</a></li>
              }
              <li><button type="button" (click)="signOut()">Cerrar sesión</button></li>
            } @else {
              <li><a routerLink="/login">Entrar</a></li>
            }
          </ul>
          <p>Las reservas son anónimas: la aplicación no muestra a nadie quién ha reservado cada regalo, tampoco a la dueña de la lista.</p>
        </div>
        @if (api.isDemo) {
          <p class="sf-credits">Modo demo: datos simulados en este navegador. {{ credits }}</p>
        }
      </div>
    </footer>
  `,
  styles: `
    .sf {
      padding: clamp(80px, 10vw, 140px) 0 56px;
      background: var(--color-night);
      color: var(--color-ivory);
    }
    .sf-mark {
      margin: 0 0 56px;
      font: 400 clamp(36px, 7.4vw, 118px) / 1 var(--font-display);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-align: center;
    }
    .sf-row {
      display: grid;
      gap: 24px;
      padding-top: 28px;
      border-top: 1px solid rgb(184 154 101 / 0.5);
    }
    ul {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 28px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    a,
    button {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0;
      border: 0;
      background: none;
      font: 500 12px/1 var(--font-sans);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--color-ivory);
      text-decoration: none;
      cursor: pointer;
    }
    @media (hover: hover) and (pointer: fine) {
      a:hover,
      button:hover {
        color: var(--color-brass);
      }
    }
    .sf-row p {
      margin: 0;
      max-width: 36rem;
      font-size: 15px;
      line-height: 1.6;
      color: var(--color-parchment);
    }
    .sf-credits {
      margin: 48px 0 0;
      font-size: 12px;
      line-height: 1.5;
      color: #cdb8b0;
    }
    @media (min-width: 900px) {
      .sf-row {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class SiteFooter {
  readonly session = inject(Session);
  readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);
  readonly credits = DEMO_PHOTO_CREDITS;

  async signOut() {
    await this.api.signOut();
    this.toasts.show('Has cerrado sesión.');
    void this.router.navigateByUrl('/');
  }
}
