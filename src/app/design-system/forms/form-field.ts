import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Label above, control projected, hint or error below (error replaces hint).
 * The control must carry [id]=forId, and aria-describedby="{forId}-msg".
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'field' },
  template: `
    <label class="field-label" [attr.for]="forId()">
      {{ label() }}
      @if (optional()) {
        <span class="opt">(opcional)</span>
      }
    </label>
    <ng-content />
    @if (error()) {
      <p class="field-error" [id]="msgId()">{{ error() }}</p>
    } @else if (hint()) {
      <p class="field-hint" [id]="msgId()">{{ hint() }}</p>
    }
  `,
  styles: `
    .opt {
      margin-left: 6px;
      letter-spacing: 0.04em;
      text-transform: none;
      font-weight: 400;
      color: var(--color-ink-soft);
    }
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly forId = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly optional = input(false);
  readonly msgId = computed(() => `${this.forId()}-msg`);
}
