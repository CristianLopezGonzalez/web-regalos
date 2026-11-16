import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import {
  IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Session } from '@app/core/auth/session';
import { InstallApp } from '@app/design-system/feedback/install-app/install-app';
import { HeaderBrand } from './header-brand';

interface NavItem {
  label: string;
  link: string;
  fragment?: string;
  exact?: boolean;
}

/**
 * Header + Navigation: the store's ivory awning with the name centred in Italiana. The links live
 * in a night drawer that slides in from the left, on phones and computers alike.
 */
@Component({
  selector: 'app-site-header',
  host: { '(document:keydown.escape)': 'menu.set(false)' },
  imports: [RouterLink, RouterLinkActive, InstallApp],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeader {
  protected readonly session = inject(Session);
  /** On the home page the name only appears once the hero's big title has scrolled away. */
  protected readonly brand = inject(HeaderBrand);
  private readonly doc = inject(DOCUMENT);

  protected readonly menu = signal(false);
  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');
  private readonly menuBtn = viewChild.required<ElementRef<HTMLButtonElement>>('menuBtn');

  protected readonly left = computed<NavItem[]>(() =>
    this.session.signedIn()
      ? [
          { label: 'Wishlist', link: '/wishlist' },
          { label: 'Categorías', link: '/', fragment: 'categorias' },
        ]
      : [{ label: 'Inicio', link: '/', exact: true }],
  );

  protected readonly right = computed<NavItem[]>(() =>
    this.session.signedIn()
      ? [
          ...(this.session.isPlanner() ? [{ label: 'Nuestros regalos', link: '/plans' }] : []),
          ...(this.session.hasList()
            ? [{ label: this.session.isOwner() ? 'Admin' : 'Mi lista', link: '/admin' }]
            : []),
          { label: 'Perfil', link: '/profile' },
        ]
      : [{ label: 'Entrar', link: '/login' }],
  );

  protected readonly items = computed(() => [...this.left(), ...this.right()]);

  protected match(i: NavItem): IsActiveMatchOptions {
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
    // Lock page scroll behind the open drawer and move focus into it; on closing, give focus
    // back to "Menú" (however it closed: Esc, backdrop, a link) instead of dropping it on <body>.
    let wasOpen = false;
    effect(() => {
      const open = this.menu();
      this.doc.documentElement.style.overflow = open ? 'hidden' : '';
      if (open) this.closeBtn()?.nativeElement.focus();
      else if (wasOpen) this.menuBtn().nativeElement.focus({ preventScroll: true });
      wasOpen = open;
    });
  }

  /** aria-modal promises the page behind is out of reach: keep Tab cycling inside the drawer. */
  protected trapTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const box = e.currentTarget as HTMLElement;
    const items = [
      ...box.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = this.doc.activeElement;
    if (e.shiftKey && (active === first || !box.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !box.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }
}
