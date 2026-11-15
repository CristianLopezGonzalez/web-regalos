import { Component, effect, inject } from '@angular/core';
import { Pwa } from '@app/core/pwa/pwa';

/**
 * Thin bar pinned to the top while the device has no connection.
 * html.is-offline (styles.css) pushes the page and the sticky header down by its height.
 */
@Component({
  selector: 'app-offline-banner',
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.css',
})
export class OfflineBanner {
  protected readonly pwa = inject(Pwa);

  constructor() {
    effect(() => document.documentElement.classList.toggle('is-offline', !this.pwa.online()));
  }
}
