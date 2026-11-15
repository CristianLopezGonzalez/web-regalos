import { Component, inject, input, signal } from '@angular/core';
import { Pwa } from '@app/core/pwa/pwa';
import { Modal } from '../modal/modal';

/**
 * "Instalar app" button. Only rendered when the app can be installed and isn't yet.
 * Android/desktop Chrome: opens the browser's install dialog. iPhone/iPad: explains Share → Add to Home Screen.
 */
@Component({
  selector: 'app-install-app',
  imports: [Modal],
  host: { '[style.display]': "pwa.canInstall() || help() ? null : 'none'" },
  templateUrl: './install-app.html',
  styleUrl: './install-app.css',
})
export class InstallApp {
  protected readonly pwa = inject(Pwa);

  /** 'night' for the dark phone menu, 'light' for ivory pages. */
  readonly tone = input<'night' | 'light'>('light');

  protected readonly help = signal<'ios' | 'menu' | null>(null);

  protected async install() {
    const r = await this.pwa.install();
    if (r === 'instructions') this.help.set(this.pwa.ios ? 'ios' : 'menu');
  }
}
