import { Component, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '@app/core/api/error-message';
import { formatShortDate } from '@app/core/format/date-format';
import { Profile } from '@app/core/models/profile';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { AdminPageHead } from '../admin-page-head/admin-page-head';

/** /admin/family: who has an account. Never what they reserved. */
@Component({
  selector: 'app-family-admin',
  imports: [RouterLink, AdminPageHead, Modal],
  templateUrl: './family-admin.html',
  styleUrl: './family-admin.css',
})
export class FamilyAdmin {
  private readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);

  protected readonly list = resource({ loader: () => this.api.listFamily() });
  protected readonly toRemove = signal<Profile | null>(null);
  protected readonly busy = signal(false);

  protected date(iso: string) {
    return formatShortDate(iso);
  }
  protected initial(name: string) {
    return name.trim().charAt(0).toUpperCase();
  }
  protected errorText(e: unknown) {
    return errorMessage(e);
  }

  protected async remove() {
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
