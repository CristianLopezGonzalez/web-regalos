import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage, formatDate } from '../../core/format';
import { Profile } from '../../core/models';
import { Toasts } from '../../core/toast';
import { WishlistApi } from '../../core/wishlist-api';
import { Modal } from '../../design-system/feedback/modal';
import { AdminPageHead } from './admin-page-head';

/** /admin/family: who has an account. Never what they reserved. */
@Component({
  selector: 'app-family-admin',
  imports: [RouterLink, AdminPageHead, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-page-head heading="Familia" lede="Quién tiene cuenta. Sus reservas no aparecen aquí ni en ningún otro sitio de tu panel.">
      <a class="btn btn-outline btn-sm" routerLink="/admin/invitations">Invitar a alguien</a>
    </app-admin-page-head>

    @if (list.isLoading() && !list.hasValue()) {
      <div class="skeleton h-40" aria-hidden="true"></div>
    } @else if (list.error()) {
      <p class="form-alert" role="alert">{{ errorText(list.error()) }}</p>
    } @else if (list.value()?.length) {
      <ul class="fa" role="list">
        @for (p of list.value(); track p.id) {
          <li>
            <span class="fa-name">
              {{ p.displayName }}
              @if (p.hasList) {
                <span class="fa-email">· con su propia lista</span>
              }
            </span>
            <span class="fa-email">{{ p.email }}</span>
            <span class="fa-since">Desde el {{ date(p.createdAt) }}</span>
            <button type="button" class="btn btn-ghost" (click)="toRemove.set(p)">Quitar acceso<span class="sr-only"> a {{ p.displayName }}</span></button>
          </li>
        }
      </ul>
    } @else {
      <p class="fa-empty">Todavía no hay nadie. Crea una invitación y compártela.</p>
    }

    <app-modal heading="¿Quitar el acceso?" [open]="!!toRemove()" (openChange)="!$event && toRemove.set(null)" [busy]="busy()">
      <p class="m-0">
        {{ toRemove()?.displayName }} ya no podrá entrar. Si tenía regalos reservados, seguirán reservados y no sabrás
        cuáles eran.
        @if (toRemove()?.hasList) {
          <strong>Su lista y todos sus deseos se borrarán también.</strong>
        }
      </p>
      <ng-container actions>
        <button type="button" class="btn btn-ghost" (click)="toRemove.set(null)" [disabled]="busy()">Cancelar</button>
        <button type="button" class="btn btn-danger" (click)="remove()" [disabled]="busy()">{{ busy() ? 'Quitando…' : 'Quitar acceso' }}</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .fa {
      margin: 0;
      padding: 0;
      list-style: none;
      border-top: 1px solid var(--color-line);
    }
    .fa li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 2px 16px;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid var(--color-line);
    }
    @media (min-width: 900px) {
      .fa li {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) 11rem auto;
      }
    }
    .fa-name {
      font: 400 17px/1.2 var(--font-serif);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .fa-email,
    .fa-since {
      grid-column: 1;
      font-size: 15px;
      color: var(--color-ink-soft);
      overflow-wrap: anywhere;
    }
    .fa li .btn {
      grid-column: 2;
      grid-row: 1 / span 3;
    }
    @media (min-width: 900px) {
      .fa-email,
      .fa-since,
      .fa li .btn {
        grid-column: auto;
        grid-row: auto;
      }
    }
    .fa-empty {
      font: italic 400 17px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
  `,
})
export class FamilyAdmin {
  private readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);
  readonly list = resource({ loader: () => this.api.listFamily() });
  readonly toRemove = signal<Profile | null>(null);
  readonly busy = signal(false);

  date(iso: string) {
    return formatDate(iso);
  }
  errorText(e: unknown) {
    return errorMessage(e);
  }

  async remove() {
    const p = this.toRemove();
    if (!p) return;
    this.busy.set(true);
    try {
      await this.api.removeFamilyMember(p.id);
      this.list.reload();
      this.toasts.show(`${p.displayName} ya no tiene acceso.`);
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
      this.toRemove.set(null);
    }
  }
}
