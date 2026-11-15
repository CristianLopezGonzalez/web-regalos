import { Component, computed, inject } from '@angular/core';
import { Session } from '@app/core/auth/session';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * The owner's back office, styled as the store's floor directory rather than a dashboard rail.
 * Vertical on desktop; a scrollable row of tabs on phones.
 */
@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.css',
})
export class AdminSidebar {
  private readonly session = inject(Session);

  protected readonly floors = ['G', '1', '2', '3', '4'];
  /** Someone with a list but not the owner (Angela) only manages her own gifts. */
  protected readonly items = computed(() => [
    { label: 'Resumen', link: '/admin', exact: true },
    { label: 'Mis regalos', link: '/admin/gifts', exact: false },
    ...(this.session.isOwner()
      ? [
          { label: 'Categorías', link: '/admin/categories', exact: true },
          { label: 'Invitaciones', link: '/admin/invitations', exact: true },
          { label: 'Familia', link: '/admin/family', exact: true },
        ]
      : []),
  ]);
}
