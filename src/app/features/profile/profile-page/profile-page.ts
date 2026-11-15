import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { DemoApi } from '@app/core/demo/demo-api';
import { errorMessage } from '@app/core/api/error-message';
import { formatDate } from '@app/core/format/date-format';
import { Gift } from '@app/core/models/gift';
import { Session } from '@app/core/auth/session';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { LabeledField } from '@app/design-system/forms/labeled-field/labeled-field';
import { InstallApp } from '@app/design-system/feedback/install-app/install-app';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { PriceLabel } from '@app/design-system/gift/price-label/price-label';
import { ProductImage } from '@app/design-system/gift/product-image/product-image';

/** /profile: name, account, "Mis reservas" (everyone can reserve, except their own wishes), sign out. */
@Component({
  selector: 'app-profile-page',
  imports: [
    FormField,
    FormRoot,
    LabeledField,
    RouterLink,
    PriceLabel,
    ProductImage,
    Modal,
    InstallApp,
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage {
  protected readonly session = inject(Session);
  protected readonly catalogue = inject(Catalogue);
  protected readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);
  private readonly router = inject(Router);

  protected readonly nameForm = form(
    signal({ displayName: '' }),
    (p) => {
      validate(p.displayName, ({ value }) =>
        value().trim() ? undefined : { kind: 'required', message: 'Escribe un nombre.' },
      );
      maxLength(p.displayName, 60, { message: 'Usa como mucho 60 caracteres.' });
    },
    { submission: { action: () => this.saveName() } },
  );
  protected readonly busy = signal(false);
  protected readonly toCancel = signal<Gift | null>(null);

  protected readonly since = computed(() => {
    const p = this.session.profile();
    return p ? formatDate(p.createdAt) : '';
  });
  protected readonly mine = computed(() =>
    (this.catalogue.gifts() ?? []).filter((g) => this.catalogue.mine().has(g.id)),
  );

  constructor() {
    effect(() => this.nameForm().reset({ displayName: this.session.profile()?.displayName ?? '' }));
  }

  private async saveName() {
    try {
      await this.api.updateDisplayName(this.nameForm.displayName().value());
      this.toasts.success('Nombre guardado.');
    } catch (e) {
      this.toasts.error(errorMessage(e));
    }
  }

  protected async cancel() {
    const g = this.toCancel();
    if (!g) return;
    this.busy.set(true);
    try {
      await this.catalogue.cancel(g.id);
      this.toasts.show('Reserva cancelada. Vuelve a estar disponible.');
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
      this.toCancel.set(null);
    }
  }

  protected async signOut() {
    await this.api.signOut();
    this.toasts.show('Has cerrado sesión.');
    void this.router.navigateByUrl('/');
  }

  protected async resetDemo() {
    if (this.api instanceof DemoApi) {
      await this.api.signOut();
      await this.api.reset();
      this.toasts.show('Demo restablecida.');
      void this.router.navigateByUrl('/login');
    }
  }
}
