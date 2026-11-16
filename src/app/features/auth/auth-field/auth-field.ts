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

type Tone = 'hint' | 'error' | 'ok';

/**
 * A field of the auth letter: label, projected control (with [formField] and [id]=forId) and one
 * message line whose height is always reserved, so a message never pushes the button.
 *
 * When to reproach (unlike LabeledField, which shows any error once the field is touched):
 *  - "empty" (required) only after trying to send (`attempted`);
 *  - a wrong format once the person leaves the field, and from then on it updates live;
 *  - with `live`, a format error is shown as a neutral hint while typing ("faltan 3 caracteres").
 */
@Component({
  selector: 'app-auth-field',
  host: { class: 'al-field' },
  template: `
    <label class="al-label" [attr.for]="forId()">{{ label() }}</label>
    <ng-content />
    <p
      class="al-msg"
      [id]="msgId()"
      [class.is-error]="msg().tone === 'error'"
      [class.is-ok]="msg().tone === 'ok'"
    >{{ msg().text }}</p>
  `,
})
export class AuthField {
  private readonly renderer = inject(Renderer2);

  readonly label = input.required<string>();
  readonly forId = input.required<string>();
  readonly hint = input<string | null>(null);
  /** Shown (as a positive note) once the value is valid and not empty. */
  readonly okText = input<string | null>(null);
  /** The form has been sent at least once: also show "empty" errors. */
  readonly attempted = input(false);
  /** A message from outside (e.g. the server says the invitation is for another email). */
  readonly error = input<string | null>(null);
  readonly live = input(false);

  private readonly control = contentChild(FormField, { descendants: true });

  protected readonly msgId = computed(() => `${this.forId()}-msg`);
  readonly msg = computed<{ text: string; tone: Tone }>(() => {
    const manual = this.error();
    if (manual) return { text: manual, tone: 'error' };
    const state = this.control()?.state();
    const err = state?.errors()[0];
    if (state && err) {
      const text = err.message ?? 'Revisa este campo.';
      const empty = err.kind === 'required';
      if (this.attempted() || (state.touched() && !empty)) return { text, tone: 'error' };
      if (this.live() && !empty) return { text, tone: 'hint' };
    } else if (state && this.okText() && String(state.value() ?? '').length) {
      return { text: this.okText()!, tone: 'ok' };
    }
    return { text: this.hint() ?? '', tone: 'hint' };
  });

  constructor() {
    afterRenderEffect(() => {
      const el = this.control()?.element;
      if (!el) return;
      const { text, tone } = this.msg();
      this.setAttr(el, 'aria-invalid', tone === 'error' ? 'true' : null);
      this.setAttr(el, 'aria-describedby', text ? this.msgId() : null);
    });
  }

  private setAttr(el: HTMLElement, name: string, value: string | null) {
    if (value == null) this.renderer.removeAttribute(el, name);
    else this.renderer.setAttribute(el, name, value);
  }
}
