import { Component, ElementRef, Injector, afterNextRender, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { LabeledField } from '../labeled-field/labeled-field';

/** How many links a gift can have besides the main one (also a CHECK in the database). */
export const MAX_EXTRA_URLS = 3;

/**
 * "+ Añadir otro enlace": up to three more shop links under the main one. Each row is a normal
 * labeled field (its https:// message shows like any other); ✕ removes it.
 */
@Component({
  selector: 'app-extra-links-field',
  imports: [FormField, LabeledField],
  templateUrl: './extra-links-field.html',
  styleUrl: './extra-links-field.css',
})
export class ExtraLinksField {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly field = input.required<FieldTree<string[]>>();
  /** Prefix for the inputs' ids (unique per form). */
  readonly idPrefix = input.required<string>();

  protected readonly max = MAX_EXTRA_URLS;

  protected add() {
    const value = this.field()().value;
    if (value().length >= this.max) return;
    value.update((v) => [...v, '']);
    const i = value().length - 1;
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLInputElement>(`#${this.idPrefix()}-${i}`)
          ?.focus(),
      { injector: this.injector },
    );
  }

  protected remove(i: number) {
    this.field()().value.update((v) => v.filter((_, j) => j !== i));
  }
}
