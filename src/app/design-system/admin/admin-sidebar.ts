import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * The owner's back office, styled as the store's floor directory rather than a dashboard rail.
 * Vertical on desktop; a scrollable row of tabs on phones.
 */
@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="as" aria-label="Administración">
      <p class="as-title">Trastienda</p>
      <ol role="list">
        @for (i of items; track i.link; let n = $index) {
          <li>
            <a [routerLink]="i.link" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: i.exact }" ariaCurrentWhenActive="page">
              <span class="as-floor tabular" aria-hidden="true">{{ floors[n] }}</span>
              <span>{{ i.label }}</span>
            </a>
          </li>
        }
      </ol>
      <a class="as-back" routerLink="/wishlist">Ver la wishlist como la familia <span aria-hidden="true">→</span></a>
    </nav>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0; /* let the tab row scroll instead of widening the grid */
    }
    .as-title {
      display: none;
      margin: 0 0 20px;
      font: 400 21px/1.1 var(--font-serif);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    ol {
      display: flex;
      gap: 24px;
      margin: 0;
      padding: 0;
      list-style: none;
      overflow-x: auto;
      scrollbar-width: none;
      border-bottom: 1px solid var(--color-line);
    }
    a {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 52px;
      text-decoration: none;
      color: var(--color-ink-soft);
      font: 500 12px/1 var(--font-sans);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      white-space: nowrap;
      transition: color 200ms ease;
    }
    a.on {
      color: var(--color-burgundy);
      box-shadow: inset 0 -2px var(--color-burgundy);
    }
    .as-floor {
      display: none;
      width: 26px;
      color: var(--color-gold);
      color: color-mix(in oklab, var(--color-gold) 70%, var(--color-chocolate));
    }
    .as-back {
      display: none;
    }
    @media (hover: hover) and (pointer: fine) {
      a:hover {
        color: var(--color-cherry);
      }
    }
    @media (min-width: 1024px) {
      .as {
        position: sticky;
        top: 112px;
      }
      .as-title,
      .as-floor {
        display: block;
      }
      ol {
        display: grid;
        gap: 0;
        border: 0;
        border-top: 1px solid var(--color-line);
      }
      li a {
        border-bottom: 1px solid var(--color-line);
      }
      a.on {
        box-shadow: inset 2px 0 var(--color-burgundy);
        padding-left: 14px;
      }
      a {
        transition:
          color 200ms ease,
          padding-left 240ms var(--ease-out-strong);
      }
      .as-back {
        display: flex;
        margin-top: 24px;
        font-size: 11px;
        letter-spacing: 0.16em;
        white-space: normal;
        line-height: 1.5;
      }
    }
  `,
})
export class AdminSidebar {
  readonly floors = ['G', '1', '2', '3', '4'];
  readonly items = [
    { label: 'Resumen', link: '/admin', exact: true },
    { label: 'Regalos', link: '/admin/gifts', exact: false },
    { label: 'Categorías', link: '/admin/categories', exact: true },
    { label: 'Invitaciones', link: '/admin/invitations', exact: true },
    { label: 'Familia', link: '/admin/family', exact: true },
  ];
}
