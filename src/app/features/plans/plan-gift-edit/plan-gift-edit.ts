import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '@app/core/api/error-message';
import { PlanGift } from '@app/core/models/plan';
import { Toasts } from '@app/core/toast/toasts';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { PlanGiftForm } from '../plan-gift-form/plan-gift-form';
import { PlansStore } from '../plans-store';

/** /plans/:personId/new and /plans/:personId/:giftId */
@Component({
  selector: 'app-plan-gift-edit',
  imports: [RouterLink, Modal, PlanGiftForm],
  templateUrl: './plan-gift-edit.html',
  styleUrl: './plan-gift-edit.css',
})
export class PlanGiftEdit {
  protected readonly store = inject(PlansStore);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  readonly personId = input.required<string>();
  /** Absent on /new. */
  readonly giftId = input<string | undefined>();

  protected readonly deleteOpen = signal(false);
  protected readonly busy = signal(false);

  protected readonly isNew = computed(() => !this.giftId());
  protected readonly person = computed(() => this.store.person(this.personId()));
  protected readonly gift = computed(() => {
    const g = this.store.gift(this.giftId());
    return g && g.personId === this.personId() ? g : null;
  });

  protected onSaved(g: PlanGift) {
    this.toasts.success(this.isNew() ? 'Regalo añadido.' : 'Cambios guardados.');
    void this.router.navigate(['/plans', g.personId]);
  }

  protected async remove() {
    const g = this.gift();
    if (!g) return;
    this.busy.set(true);
    try {
      await this.store.deleteGift(g.id);
      this.deleteOpen.set(false);
      this.toasts.show(`«${g.name}» borrado.`);
      void this.router.navigate(['/plans', g.personId]);
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
