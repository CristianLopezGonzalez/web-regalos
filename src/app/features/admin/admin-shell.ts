import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebar } from '../../design-system/admin/admin-sidebar';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, AdminSidebar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap ash">
      <app-admin-sidebar />
      <div class="min-w-0"><router-outlet /></div>
    </div>
  `,
  styles: `
    .ash {
      display: grid;
      gap: 40px;
      padding-block: clamp(32px, 5vw, 72px) clamp(96px, 12vw, 160px);
    }
    @media (min-width: 1024px) {
      .ash {
        grid-template-columns: 220px minmax(0, 1fr);
        gap: clamp(48px, 6vw, 96px);
        align-items: start;
      }
    }
  `,
})
export class AdminShell {}
