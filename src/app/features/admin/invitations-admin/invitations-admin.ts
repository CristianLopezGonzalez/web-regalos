import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { errorMessage } from '@app/core/api/error-message';
import { formatShortDate } from '@app/core/format/date-format';
import { Invitation, InvitationState, invitationState } from '@app/core/models/invitation';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { LabeledField } from '@app/design-system/forms/labeled-field/labeled-field';
import { emailAddress } from '@app/design-system/forms/validators';
import { AdminPageHead } from '../admin-page-head/admin-page-head';

/** <select> values are strings; converted in create(). */
interface NewInvitation {
  email: string;
  kind: 'family' | 'list';
  days: '7' | '14' | '30';
}
const NEW_INVITATION: NewInvitation = { email: '', kind: 'family', days: '14' };

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
  imports: [FormField, FormRoot, LabeledField, AdminPageHead],
  templateUrl: './invitations-admin.html',
  styleUrl: './invitations-admin.css',
})
export class InvitationsAdmin {
  private readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);

  protected readonly label = STATE_LABEL;

  protected readonly form = form(
    signal({ ...NEW_INVITATION }),
    (p) => emailAddress(p.email, 'Este email no parece completo.'),
    { submission: { action: () => this.create() } },
  );
  protected readonly kindHint = computed(() =>
    this.form.kind().value() === 'list'
      ? 'Podrá añadir sus deseos y reservar los de los demás. No verá lo que le reserven.'
      : 'Verá las listas y podrá reservar regalos.',
  );
  protected readonly busy = signal(false);
  protected readonly link = signal<string | null>(null);
  protected readonly copied = signal(false);

  protected readonly list = resource({ loader: () => this.api.listInvitations() });
  protected readonly rows = computed(() =>
    (this.list.value() ?? []).map((inv) => ({ inv, state: invitationState(inv) })),
  );

  protected short(iso: string) {
    return formatShortDate(iso);
  }
  protected errorText(e: unknown) {
    return errorMessage(e);
  }

  private async create() {
    this.copied.set(false);
    const { email, kind, days } = this.form().value();
    try {
      const token = await this.api.createInvitation(
        email.trim() || null,
        Number(days),
        kind === 'list',
      );
      this.link.set(`${location.origin}/register?invite=${encodeURIComponent(token)}`);
      // Ready for the next one; keeps the chosen expiry.
      this.form().reset({ ...NEW_INVITATION, days });
      this.list.reload();
    } catch (e) {
      this.toasts.error(errorMessage(e));
    }
  }

  protected async copy(l: string) {
    try {
      await navigator.clipboard.writeText(l);
      this.copied.set(true);
      this.toasts.success('Enlace copiado. Ya puedes pegarlo donde quieras.');
    } catch {
      (document.getElementById('iv-link') as HTMLInputElement | null)?.select();
      this.toasts.show(
        'No se pudo copiar automáticamente: el enlace está seleccionado, cópialo con Ctrl+C.',
      );
    }
  }

  protected async revoke(inv: Invitation) {
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
