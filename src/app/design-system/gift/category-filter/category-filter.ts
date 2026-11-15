import { Component, ElementRef, afterRenderEffect, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '@app/core/models/category';

/**
 * The store directory as tabs: every department with its floor letter and count.
 * State lives in the URL (?categoria=slug) so filters survive reloads and can be shared.
 * A gold rule slides under the active department (transform only).
 */
@Component({
  selector: 'app-category-filter',
  imports: [RouterLink],
  host: { class: 'block' },
  templateUrl: './category-filter.html',
  styleUrl: './category-filter.css',
})
export class CategoryFilter {
  readonly categories = input.required<Category[]>();
  readonly counts = input<Record<string, number>>({});
  readonly total = input(0);
  /** Active category slug, or null for all. */
  readonly active = input<string | null>(null);

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  protected readonly rule = signal('scaleX(0)');

  constructor() {
    afterRenderEffect(() => {
      this.active();
      this.categories();
      const nav = this.track().nativeElement;
      const on = nav.querySelector<HTMLElement>('a.on');
      if (!on) return this.rule.set('scaleX(0)');
      this.rule.set(`translateX(${on.offsetLeft}px) scaleX(${on.offsetWidth})`);
      if (
        on.offsetLeft + on.offsetWidth > nav.scrollLeft + nav.clientWidth ||
        on.offsetLeft < nav.scrollLeft
      ) {
        nav.scrollTo({ left: on.offsetLeft - 16, behavior: 'smooth' });
      }
    });
  }
}
