import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineBanner } from './design-system/feedback/offline-banner';
import { ToastOutlet } from './design-system/feedback/toast-outlet';
import { SiteFooter } from './design-system/layout/site-footer';
import { SiteHeader } from './design-system/layout/site-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, ToastOutlet, OfflineBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main" (click)="skip($event)">Saltar al contenido</a>
    <app-site-header />
    <main id="main" tabindex="-1" class="block min-h-[calc(100svh-64px)] outline-none">
      <router-outlet />
    </main>
    <app-site-footer />
    <app-toast-outlet />
    <app-offline-banner />
  `,
})
export class App {
  skip(e: Event) {
    e.preventDefault();
    document.getElementById('main')?.focus();
  }
}
