import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { IsActiveMatchOptions, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Session } from '../../core/session';

interface NavItem {
  label: string;
  link: string;
  fragment?: string;
  exact?: boolean;
}

/**
 * Header + Navigation: the store's ivory awning. Name centred in Italiana, small capitals
 * either side. On phones the links move into a full-screen night menu.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sh">
      <nav class="sh-in" aria-label="Principal">
        <ul class="sh-links" role="list">
          @for (i of left(); track i.label) {
            <li>
              <a [routerLink]="i.link" [fragment]="i.fragment" routerLinkActive="on" [routerLinkActiveOptions]="match(i)" ariaCurrentWhenActive="page">{{ i.label }}</a>
            </li>
          }
        </ul>
        <a class="sh-mark" routerLink="/" lang="en" aria-label="My Christmas Wishlist, inicio">My Christmas Wishlist</a>
        <ul class="sh-links sh-links--right" role="list">
          @for (i of right(); track i.label) {
            <li>
              <a [routerLink]="i.link" routerLinkActive="on" [routerLinkActiveOptions]="match(i)" ariaCurrentWhenActive="page">{{ i.label }}</a>
            </li>
          }
        </ul>
        <button type="button" class="sh-menu-btn" [attr.aria-expanded]="menu()" aria-controls="sh-menu" (click)="menu.set(!menu())">
          {{ menu() ? 'Cerrar' : 'Menú' }}
        </button>
      </nav>
      @if (menu()) {
        <div id="sh-menu" class="sh-menu" animate.enter="sh-menu-in" animate.leave="sh-menu-out" (keydown.escape)="menu.set(false)">
          <ul role="list">
            @for (i of [...left(), ...right()]; track i.label) {
              <li><a [routerLink]="i.link" [fragment]="i.fragment" (click)="menu.set(false)">{{ i.label }}</a></li>
            }
          </ul>
          @if (session.signedIn()) {
            <p class="sh-menu-who">Has entrado como {{ session.profile()?.displayName }}</p>
          }
        </div>
      }
    </header>
  `,
  styles: `
    .sh {
      position: sticky;
      top: 0;
      z-index: 40;
      background: var(--color-ivory);
      border-bottom: 1px solid var(--color-line);
    }
    .sh-in {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      width: min(100% - 32px, 1280px);
      height: 64px;
      margin-inline: auto;
    }
    @media (min-width: 768px) {
      .sh-in {
        width: min(100% - 10vw, 1280px);
      }
    }
    .sh-links {
      display: none;
      gap: 36px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .sh-links--right {
      justify-content: flex-end;
    }
    .sh-links a,
    .sh-menu-btn {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      font: 500 12px/1 var(--font-sans);
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--color-chocolate);
      text-decoration: none;
      transition: color 200ms ease;
    }
    .sh-links a.on {
      color: var(--color-burgundy);
      text-decoration: underline;
      text-decoration-color: var(--color-gold);
      text-underline-offset: 8px;
    }
    @media (hover: hover) and (pointer: fine) {
      .sh-links a:hover {
        color: var(--color-cherry);
      }
    }
    .sh-mark {
      grid-column: 1 / span 2;
      justify-self: start;
      font: 400 14px/1 var(--font-serif);
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-burgundy);
      text-decoration: none;
      white-space: nowrap;
    }
    .sh-menu-btn {
      grid-column: 3;
      justify-self: end;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
    }
    .sh-menu {
      position: fixed;
      inset: 64px 0 0;
      display: grid;
      align-content: start;
      padding: 32px 16px;
      background: var(--color-night);
      overflow: auto;
    }
    .sh-menu ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .sh-menu a {
      display: block;
      padding: 6px 0;
      font: 400 40px/1.3 var(--font-display);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-ivory);
      text-decoration: none;
    }
    .sh-menu-who {
      margin: 32px 0 0;
      padding-top: 20px;
      border-top: 1px solid var(--color-line);
      font: italic 400 16px/1.4 var(--font-serif);
      color: var(--color-parchment);
    }
    .sh-menu-in {
      animation: sh-in 240ms var(--ease-out-strong) both;
    }
    .sh-menu-out {
      animation: sh-in 160ms ease-in reverse both;
    }
    @keyframes sh-in {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
    }
    @media (min-width: 960px) {
      .sh-links {
        display: flex;
      }
      .sh-mark {
        grid-column: 2;
        justify-self: center;
        font-size: 16px;
      }
      .sh-menu-btn,
      .sh-menu {
        display: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .sh-menu-in,
      .sh-menu-out {
        animation: none;
      }
    }
  `,
})
export class SiteHeader {
  readonly session = inject(Session);
  readonly menu = signal(false);
  private readonly doc = inject(DOCUMENT);

  readonly left = computed<NavItem[]>(() =>
    this.session.signedIn()
      ? [
          { label: 'Wishlist', link: '/wishlist' },
          { label: 'Categorías', link: '/', fragment: 'categorias' },
        ]
      : [{ label: 'Inicio', link: '/', exact: true }],
  );

  readonly right = computed<NavItem[]>(() =>
    this.session.signedIn()
      ? [...(this.session.isOwner() ? [{ label: 'Admin', link: '/admin' }] : []), { label: 'Perfil', link: '/profile' }]
      : [{ label: 'Entrar', link: '/login' }],
  );

  match(i: NavItem): IsActiveMatchOptions {
    return {
      paths: i.exact || i.fragment ? 'exact' : 'subset',
      queryParams: 'ignored',
      matrixParams: 'ignored',
      fragment: i.fragment ? 'exact' : 'ignored',
    };
  }

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menu.set(false));
    // Lock page scroll behind the open menu.
    effect(() => {
      this.doc.documentElement.style.overflow = this.menu() ? 'hidden' : '';
    });
  }
}
