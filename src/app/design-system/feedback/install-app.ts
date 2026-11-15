import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Pwa } from '../../core/pwa';
import { Modal } from './modal';

/**
 * "Instalar app" button. Only rendered when the app can be installed and isn't yet.
 * Android/desktop Chrome: opens the browser's install dialog. iPhone/iPad: explains Share → Add to Home Screen.
 */
@Component({
  selector: 'app-install-app',
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.display]': "pwa.canInstall() || help() ? null : 'none'" },
  template: `
    @if (pwa.canInstall()) {
      <button type="button" [class]="tone() === 'night' ? 'ia-btn ia-night' : 'btn btn-outline btn-sm'" (click)="install()">
        <svg class="ia-ico" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.5v8.5M4.5 6.5 8 10l3.5-3.5M2.5 11.5v2h11v-2" fill="none" stroke="currentColor" stroke-width="1.4" />
        </svg>
        Instalar la app
      </button>
    }
    <app-modal heading="Instalar la app" [open]="!!help()" (openChange)="!$event && help.set(null)">
      @if (help() === 'ios') {
        <ol class="ia-steps">
          <li>Pulsa el botón <strong>Compartir</strong>: el cuadrado con una flecha hacia arriba. En Safari está abajo; en Chrome, arriba a la derecha.</li>
          <li>Baja y elige <strong>Añadir a pantalla de inicio</strong>.</li>
          <li>Pulsa <strong>Añadir</strong>. La wishlist aparecerá con su icono, como una app más.</li>
        </ol>
      } @else {
        <ol class="ia-steps">
          <li>Abre el menú del navegador: los tres puntos <strong>⋮</strong>, arriba a la derecha.</li>
          <li>Elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</li>
          <li>Confirma. La wishlist aparecerá con su icono, como una app más.</li>
        </ol>
      }
      <ng-container actions>
        <button type="button" class="btn btn-primary" (click)="help.set(null)">Entendido</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .ia-ico {
      width: 16px;
      height: 16px;
      flex: none;
    }
    .ia-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 0 18px;
      border: 1px solid var(--color-gold);
      background: none;
      font: 500 13px/1 var(--font-sans);
      letter-spacing: 0.16em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background-color 160ms var(--ease-out-strong);
    }
    .ia-night {
      color: var(--color-brass);
    }
    @media (hover: hover) and (pointer: fine) {
      .ia-night:hover {
        background: rgb(184 154 101 / 0.12);
      }
    }
    .ia-btn:active {
      transform: scale(0.98);
    }
    .btn .ia-ico {
      margin-right: 8px;
    }
    .ia-steps {
      margin: 0;
      padding-left: 1.25em;
      list-style: decimal; /* preflight removes list markers */
      display: grid;
      gap: 12px;
      font-size: 17px;
      line-height: 1.5;
    }
  `,
})
export class InstallApp {
  readonly pwa = inject(Pwa);
  /** 'night' for the dark phone menu, 'light' for ivory pages. */
  readonly tone = input<'night' | 'light'>('light');
  readonly help = signal<'ios' | 'menu' | null>(null);

  async install() {
    const r = await this.pwa.install();
    if (r === 'instructions') this.help.set(this.pwa.ios ? 'ios' : 'menu');
  }
}
