import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage, formatShortDate } from '../../core/format';
import { Invitation, InvitationState, invitationState } from '../../core/models';
import { Toasts } from '../../core/toast';
import { WishlistApi } from '../../core/wishlist-api';
import { EMAIL_PATTERN } from '../../design-system/forms/form-utils';
import { AdminPageHead } from './admin-page-head';

const STATE_LABEL: Record<InvitationState, string> = {
  pending: 'Pendiente',
  used: 'Usada',
  expired: 'Caducada',
  revoked: 'Revocada',
};

/**
 * /admin/invitations. The link is shown exactly once: only its SHA-256 hash is stored,
 * so a lost link cannot be recovered, only replaced.
 */
@Component({
  selector: 'app-invitations-admin',
  imports: [FormsModule, AdminPageHead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-page-head heading="Invitaciones" lede="Crea un enlace, cópialo y envíaselo a quien quieras por WhatsApp, email o como prefieras. Cada enlace sirve para una sola cuenta." />

    <section class="iv-new" aria-labelledby="new-h">
      <h2 id="new-h">Nueva invitación</h2>
      <form class="iv-form" (ngSubmit)="create()">
        <div class="field">
          <label class="field-label" for="iv-email">Para el email <span class="normal-case tracking-normal font-normal text-ink-soft">(opcional)</span></label>
          <input id="iv-email" class="input" type="email" name="email" [(ngModel)]="email" spellcheck="false" autocomplete="off" placeholder="tia@ejemplo.com" aria-describedby="iv-email-msg" [attr.aria-invalid]="emailError() ? true : null" />
          @if (emailError()) {
            <p class="field-error" id="iv-email-msg">{{ emailError() }}</p>
          } @else {
            <p class="field-hint" id="iv-email-msg">Si lo indicas, solo se podrá usar con ese email.</p>
          }
        </div>
        <div class="field">
          <label class="field-label" for="iv-days">Caduca en</label>
          <select id="iv-days" class="input" name="days" [(ngModel)]="days">
            <option [ngValue]="7">7 días</option>
            <option [ngValue]="14">14 días</option>
            <option [ngValue]="30">30 días</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="busy()">{{ busy() ? 'Creando…' : 'Crear enlace' }}</button>
      </form>

      @if (link(); as l) {
        <div class="iv-link" role="status">
          <label class="field-label" for="iv-link">Enlace de invitación</label>
          <div class="iv-link-row">
            <input id="iv-link" class="input tabular" [value]="l" readonly (focus)="$any($event.target).select()" />
            <button type="button" class="btn btn-outline btn-sm" (click)="copy(l)">{{ copied() ? 'Copiado' : 'Copiar' }}</button>
          </div>
          <p class="field-hint">Solo se muestra ahora. Si lo pierdes, revoca esta invitación y crea otra.</p>
        </div>
      }
    </section>

    <section aria-labelledby="list-h">
      <h2 id="list-h">Enviadas</h2>
      @if (list.isLoading() && !list.hasValue()) {
        <div class="skeleton h-40" aria-hidden="true"></div>
      } @else if (list.error()) {
        <p class="form-alert" role="alert">{{ errorText(list.error()) }} <button type="button" class="btn btn-ghost" (click)="list.reload()">Reintentar</button></p>
      } @else if (rows().length) {
        <ul class="iv-list" role="list">
          @for (r of rows(); track r.inv.id) {
            <li>
              <span class="iv-who">{{ r.inv.emailRestriction ?? 'Cualquier email' }}</span>
              <span class="iv-dates">Creada el {{ short(r.inv.createdAt) }} · {{ r.state === 'used' ? 'usada el ' + short(r.inv.usedAt!) : 'caduca el ' + short(r.inv.expiresAt) }}</span>
              <span class="iv-state" [class]="'iv-state iv-' + r.state">{{ label[r.state] }}</span>
              @if (r.state === 'pending') {
                <button type="button" class="btn btn-ghost" (click)="revoke(r.inv)" [disabled]="busy()">Revocar</button>
              }
            </li>
          }
        </ul>
      } @else {
        <p class="iv-empty">Todavía no has creado ninguna invitación.</p>
      }
    </section>
  `,
  styles: `
    h2 {
      margin: 0 0 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--color-line);
      font: 400 21px/1.1 var(--font-serif);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .iv-new {
      margin-bottom: clamp(56px, 7vw, 88px);
    }
    .iv-form {
      display: grid;
      gap: 20px;
      max-width: 720px;
    }
    @media (min-width: 768px) {
      .iv-form {
        grid-template-columns: minmax(0, 1fr) 10rem auto;
        align-items: start;
      }
      .iv-form .btn {
        margin-top: 28px;
      }
    }
    .iv-link {
      display: grid;
      gap: 10px;
      margin-top: 28px;
      padding: 20px;
      max-width: 720px;
      background: var(--color-ivory);
      border: 1px solid var(--color-gold);
    }
    .iv-link-row {
      display: flex;
      gap: 12px;
    }
    .iv-link .input {
      font-size: 14px;
    }
    .iv-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .iv-list li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 4px 16px;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid var(--color-line);
    }
    @media (min-width: 900px) {
      .iv-list li {
        grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.4fr) 7rem 6rem;
      }
    }
    .iv-who {
      font-size: 17px;
      overflow-wrap: anywhere;
    }
    .iv-dates {
      grid-column: 1;
      font-size: 14px;
      color: var(--color-ink-soft);
    }
    @media (min-width: 900px) {
      .iv-dates {
        grid-column: auto;
      }
    }
    .iv-state {
      font: 500 11px/1 var(--font-sans);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
    }
    .iv-pending {
      color: var(--color-burgundy);
    }
    .iv-empty {
      font: italic 400 17px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
  `,
})
export class InvitationsAdmin {
  private readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);
  readonly label = STATE_LABEL;

  email = '';
  days = 14;
  readonly busy = signal(false);
  readonly link = signal<string | null>(null);
  readonly copied = signal(false);
  readonly submitted = signal(false);

  readonly list = resource({ loader: () => this.api.listInvitations() });
  readonly rows = computed(() => (this.list.value() ?? []).map((inv) => ({ inv, state: invitationState(inv) })));

  emailError() {
    const v = this.email.trim();
    return this.submitted() && v && !EMAIL_PATTERN.test(v) ? 'Este email no parece completo.' : null;
  }
  short(iso: string) {
    return formatShortDate(iso);
  }
  errorText(e: unknown) {
    return errorMessage(e);
  }

  async create() {
    this.submitted.set(true);
    if (this.emailError()) return;
    this.busy.set(true);
    this.copied.set(false);
    try {
      const token = await this.api.createInvitation(this.email.trim() || null, this.days);
      this.link.set(`${location.origin}/register?invite=${encodeURIComponent(token)}`);
      this.email = '';
      this.submitted.set(false);
      this.list.reload();
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  async copy(l: string) {
    try {
      await navigator.clipboard.writeText(l);
      this.copied.set(true);
      this.toasts.success('Enlace copiado. Ya puedes pegarlo donde quieras.');
    } catch {
      (document.getElementById('iv-link') as HTMLInputElement | null)?.select();
      this.toasts.show('No se pudo copiar automáticamente: el enlace está seleccionado, cópialo con Ctrl+C.');
    }
  }

  async revoke(inv: Invitation) {
    this.busy.set(true);
    try {
      await this.api.revokeInvitation(inv.id);
      this.list.reload();
      this.toasts.show('Invitación revocada: el enlace ya no funciona.');
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
