import { Component, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { FormField, FormRoot, form, maxLength, min, validate } from '@angular/forms/signals';
import { errorMessage } from '@app/core/api/error-message';
import { PlanPerson } from '@app/core/models/plan';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { LabeledField } from '@app/design-system/forms/labeled-field/labeled-field';
import { PlansStore } from '../plans-store';

/** Add or edit someone we give presents to: a free name and an optional budget. */
@Component({
  selector: 'app-plan-person-dialog',
  imports: [Modal, FormField, FormRoot, LabeledField],
  templateUrl: './plan-person-dialog.html',
})
export class PlanPersonDialog {
  private readonly store = inject(PlansStore);

  readonly open = model(false);
  /** null = a new person. */
  readonly person = input<PlanPerson | null>(null);

  readonly saved = output<PlanPerson>();

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
        this.form().reset({ name: p?.name ?? '', budget: p?.budget ?? null });
      });
    });
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
