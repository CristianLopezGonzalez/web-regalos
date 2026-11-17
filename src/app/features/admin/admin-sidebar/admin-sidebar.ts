import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject } from '@angular/core';
import { Session } from '@app/core/auth/session';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

/**
 * The back room's night panel. A full-height column on desktop; on phones and tablets a band
 * on top with a scrollable row of tabs.
 */
@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.css',
})
export class AdminSidebar {
  private readonly session = inject(Session);

  /** Someone with a list but not the owner (Angela) only manages her own gifts. */
  protected readonly items = computed(() => [
    { label: 'Resumen', link: '/admin', exact: true, icon: 'home' },
    { label: 'Mis regalos', link: '/admin/gifts', exact: false, icon: 'gift' },
    ...(this.session.isOwner()
      ? [
          { label: 'Categorías', link: '/admin/categories', exact: true, icon: 'list' },
          { label: 'Invitaciones', link: '/admin/invitations', exact: true, icon: 'mail' },
          { label: 'Familia', link: '/admin/family', exact: true, icon: 'people' },
        ]
      : []),
  ]);

  constructor() {
    // Phones/tablets: the tabs scroll sideways; keep the current one in view.
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const reveal = () => {
      const row = host.querySelector('ol');
      const on = row?.querySelector<HTMLElement>('a.on');
      if (!row || !on || row.scrollWidth <= row.clientWidth) return;
      const r = row.getBoundingClientRect();
      const a = on.getBoundingClientRect();
      if (a.left < r.left || a.right > r.right) {
        row.scrollLeft += a.left - r.left - (r.width - a.width) / 2;
      }
    };
    afterNextRender(reveal);
    const sub = inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => setTimeout(reveal));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}
