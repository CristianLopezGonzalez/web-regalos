import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../core/models';

/**
 * The store directory as tabs: every department with its floor letter and count.
 * State lives in the URL (?categoria=slug) so filters survive reloads and can be shared.
 * A gold rule slides under the active department (transform only).
 */
@Component({
  selector: 'app-category-filter',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <nav class="cf" aria-label="Categorías" #track>
      <ul role="list">
        <li>
          <a
            [routerLink]="[]"
            [queryParams]="{ categoria: null }"
            queryParamsHandling="merge"
            [attr.aria-current]="active() === null ? 'page' : null"
            [class.on]="active() === null"
          >
            <span class="cf-name">Todo</span><span class="cf-count tabular">{{ total() }}</span>
          </a>
        </li>
        @for (c of categories(); track c.id) {
          <li>
            <a
              [routerLink]="[]"
              [queryParams]="{ categoria: c.slug }"
              queryParamsHandling="merge"
              [attr.aria-current]="active() === c.slug ? 'page' : null"
              [class.on]="active() === c.slug"
            >
              <span class="cf-name">{{ c.name }}</span><span class="cf-count tabular">{{ counts()[c.id] ?? 0 }}</span>
            </a>
          </li>
        }
      </ul>
      <span class="cf-rule" aria-hidden="true" [style.transform]="rule()"></span>
    </nav>
  `,
  styles: `
    .cf {
      position: relative;
      overflow-x: auto;
      scrollbar-width: none;
      border-bottom: 1px solid var(--color-line);
    }
    .cf::-webkit-scrollbar {
      display: none;
    }
    ul {
      display: flex;
      gap: 4px 30px;
      margin: 0;
      padding: 0;
      list-style: none;
      width: max-content;
    }
    a {
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
      min-height: 52px;
      padding: 18px 0 14px;
      text-decoration: none;
      color: var(--color-ink-soft);
      transition: color 200ms ease;
    }
    .cf-name {
      font: 500 13px/1 var(--font-sans);
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    .cf-count {
      font-size: 12px;
      color: var(--color-gold);
      color: color-mix(in oklab, var(--color-gold) 70%, var(--color-chocolate));
    }
    a.on {
      color: var(--color-burgundy);
    }
    @media (hover: hover) and (pointer: fine) {
      a:hover {
        color: var(--color-cherry);
      }
    }
    .cf-rule {
      position: absolute;
      left: 0;
      bottom: -1px;
      width: 1px;
      height: 2px;
      background: var(--color-burgundy);
      transform-origin: left center;
      transition: transform 240ms var(--ease-out-strong);
    }
    @media (prefers-reduced-motion: reduce) {
      .cf-rule {
        transition: none;
      }
    }
  `,
})
export class CategoryFilter {
  readonly categories = input.required<Category[]>();
  readonly counts = input<Record<string, number>>({});
  readonly total = input(0);
  /** Active category slug, or null for all. */
  readonly active = input<string | null>(null);

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  readonly rule = signal('scaleX(0)');

  constructor() {
    afterRenderEffect(() => {
      this.active();
      this.categories();
      const nav = this.track().nativeElement;
      const on = nav.querySelector<HTMLElement>('a.on');
      if (!on) return this.rule.set('scaleX(0)');
      this.rule.set(`translateX(${on.offsetLeft}px) scaleX(${on.offsetWidth})`);
      if (on.offsetLeft + on.offsetWidth > nav.scrollLeft + nav.clientWidth || on.offsetLeft < nav.scrollLeft) {
        nav.scrollTo({ left: on.offsetLeft - 16, behavior: 'smooth' });
      }
    });
  }
}
