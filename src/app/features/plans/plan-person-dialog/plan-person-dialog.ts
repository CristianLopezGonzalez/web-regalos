import { Component, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { FormField, FormRoot, form, maxLength, min, validate } from '@angular/forms/signals';
import { errorMessage } from '@app/core/api/error-message';
import { PlanPerson } from '@app/core/models/plan';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { LabeledField } from '@app/design-system/forms/labeled-field/labeled-field';
import { PlansStore } from '../plans-store';

/**
 * Add or edit someone we give presents to: a free name and an optional budget (quick amounts or
 * any other). When editing, they can also be taken off the list (with their presents).
 */
@Component({
  selector: 'app-plan-person-dialog',
  imports: [Modal, FormField, FormRoot, LabeledField],
  templateUrl: './plan-person-dialog.html',
  styleUrl: './plan-person-dialog.css',
})
export class PlanPersonDialog {
  private readonly store = inject(PlansStore);

  readonly open = model(false);
  /** null = a new person. */
  readonly person = input<PlanPerson | null>(null);

  readonly saved = output<PlanPerson>();
  readonly deleted = output<void>();

  protected readonly quick = [50, 100, 150, 200];
  protected readonly confirming = signal(false);
  protected readonly deleting = signal(false);

  protected readonly form = form(
    signal<{ name: string; budget: number | null }>({ name: '', budget: null }),
    (p) => {
      validate(p.name, ({ value }) =>
        value().trim() ? undefined : { kind: 'required', message: 'Escribe su nombre.' },
      );
      maxLength(p.name, 60, { message: 'Usa como mucho 60 caracteres.' });
      min(p.budget, 0, { message: 'El presupuesto no puede ser negativo.' });
    },
    { submission: { action: () => this.save() } },
  );
  protected readonly failure = signal<string | null>(null);

  constructor() {
    // Each time it opens: the person's current values, untouched.
    effect(() => {
      if (!this.open()) return;
      const p = untracked(this.person);
      untracked(() => {
        this.failure.set(null);
        this.confirming.set(false);
        this.form().reset({ name: p?.name ?? '', budget: p?.budget ?? null });
      });
    });
  }

  /** A quick amount; pressing the chosen one again clears it. */
  protected setBudget(amount: number) {
    const now = this.form.budget().value();
    this.form.budget().value.set(now === amount ? null : amount);
  }

  protected async remove() {
    const p = this.person();
    if (!p) return;
    this.deleting.set(true);
    this.failure.set(null);
    try {
      await this.store.deletePerson(p.id);
      this.open.set(false);
      this.deleted.emit();
    } catch (e) {
      this.failure.set(errorMessage(e));
    } finally {
      this.deleting.set(false);
      this.confirming.set(false);
    }
  }

  private async save() {
    this.failure.set(null);
    const { name, budget } = this.form().value();
    try {
      const saved = await this.store.savePerson(this.person()?.id ?? null, {
        name: name.trim(),
        budget: budget === null || Number.isNaN(budget) ? null : Math.round(budget * 100) / 100,
      });
      this.open.set(false);
      this.saved.emit(saved);
    } catch (e) {
      this.failure.set(errorMessage(e));
    }
  }
}
