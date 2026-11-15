import {
  Component,
  Renderer2,
  afterRenderEffect,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';
import { FormField } from '@angular/forms/signals';

/**
 * Label above, control projected, hint or error below (error replaces hint).
 *
 * With a Signal Forms control inside (`<input [formField]="form.email" />`) it shows the field's
 * first validation message once the field has been touched (or the form submitted), and keeps
 * `aria-invalid` / `aria-describedby` on the control in sync. `error` overrides it by hand.
 * The control must carry [id]=forId.
 */
@Component({
  selector: 'app-labeled-field',
  host: { class: 'field' },
  templateUrl: './labeled-field.html',
  styleUrl: './labeled-field.css',
})
export class LabeledField {
  private readonly renderer = inject(Renderer2);

  readonly label = input.required<string>();
  readonly forId = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly optional = input(false);

  private readonly control = contentChild(FormField, { descendants: true });

  protected readonly msgId = computed(() => `${this.forId()}-msg`);
  protected readonly message = computed(() => {
    const manual = this.error();
    if (manual) return manual;
    const state = this.control()?.state();
    if (!state || !state.touched() || !state.invalid()) return null;
    return state.errors()[0]?.message ?? 'Revisa este campo.';
  });

  constructor() {
    afterRenderEffect(() => {
      const el = this.control()?.element;
      if (!el) return;
      const describedBy = this.message() || this.hint() ? this.msgId() : null;
      this.setAttr(el, 'aria-invalid', this.message() ? 'true' : null);
      this.setAttr(el, 'aria-describedby', describedBy);
    });
  }

  private setAttr(el: HTMLElement, name: string, value: string | null) {
    if (value == null) this.renderer.removeAttribute(el, name);
    else this.renderer.setAttribute(el, name, value);
  }
}
