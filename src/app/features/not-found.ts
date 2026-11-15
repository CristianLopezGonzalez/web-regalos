import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap nf">
      <p class="caps">Error 404</p>
      <h1>Este escaparate está vacío</h1>
      <p class="nf-lede">La página que buscas no existe o ha cambiado de sitio.</p>
      <a class="btn btn-primary" routerLink="/">Volver al inicio</a>
    </div>
  `,
  styles: `
    .nf {
      padding-block: clamp(96px, 14vw, 200px);
      text-align: center;
    }
    .caps {
      margin: 0 0 20px;
      color: var(--color-ink-soft);
    }
    h1 {
      margin: 0;
      font: 400 clamp(40px, 6vw, 80px) / 1 var(--font-display);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .nf-lede {
      margin: 24px auto 36px;
      max-width: 30rem;
      font: italic 400 19px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
  `,
})
export class NotFound {}
