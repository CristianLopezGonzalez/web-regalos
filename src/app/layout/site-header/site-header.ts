import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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
  private readonly doc = inject(DOCUMENT);

  protected readonly menu = signal(false);
  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

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
    // Lock page scroll behind the open drawer and move focus into it.
    effect(() => {
      this.doc.documentElement.style.overflow = this.menu() ? 'hidden' : '';
      this.closeBtn()?.nativeElement.focus();
    });
  }
}
