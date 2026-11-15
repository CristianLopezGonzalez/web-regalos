import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalogue } from '../../core/catalogue';
import { Session } from '../../core/session';
import { GiftGrid } from '../../design-system/gift/gift-grid';
import { Hero } from '../../design-system/hero/hero';

const FLOORS = ['G', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * HOME. Visitors without a session see the hero and the introduction only: no gift data
 * is requested (the database would refuse it anyway). Signed in: directory + favourites.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, Hero, GiftGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-hero [ctaLink]="'/wishlist'" [ctaFragment]="session.signedIn() ? null : 'descubre'" />

    <section id="descubre" class="intro" aria-labelledby="intro-h">
      <div class="wrap intro-in">
        <h2 id="intro-h">Nada de esto es obligatorio. Todo es una pequeña ilusión.</h2>
        @if (session.signedIn()) {
          <p>
            Estas son las cosas que nos encantaría desenvolver este año. Elige una lista: en cada escaparate verás el
            precio y dónde encontrarlo.
          </p>
          <ul class="lists" role="list">
            @for (l of catalogue.lists() ?? []; track l.id) {
              <li>
                <a class="list-card" routerLink="/wishlist" [queryParams]="{ para: l.id }">
                  <span class="list-eyebrow">{{ l.id === catalogue.meId() ? 'Tu lista' : 'La lista de' }}</span>
                  <span class="list-name">{{ l.name }}</span>
                  <span class="list-count tabular">{{ catalogue.giftsFor(l.id).length }} deseos</span>
                </a>
              </li>
            } @empty {
              @if (!catalogue.loaded()) {
                <li class="list-card skeleton" aria-hidden="true"></li>
                <li class="list-card skeleton" aria-hidden="true"></li>
              }
            }
          </ul>
          <p class="plaque-note">
            Reserva un regalo antes de comprarlo, así nadie lo compra dos veces. Tu nombre queda oculto, y nadie ve lo que
            le han reservado de su propia lista.
          </p>
        } @else {
          <p>
            Es una lista privada para la familia. Entra con tu cuenta para ver los regalos; si es tu primera vez, abre el
            enlace de invitación que te he enviado.
          </p>
          <div class="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 mt-5">
            <a class="btn btn-primary" routerLink="/login">Entrar</a>
          </div>
        }
      </div>
    </section>

    @if (session.signedIn()) {
      <section id="categorias" class="dir" aria-labelledby="dir-h">
        <div class="wrap">
          <div class="board">
            <h2 id="dir-h">Directorio</h2>
            <p class="board-sub">
              @if (catalogue.loaded()) {
                {{ catalogue.stats().total }} deseos repartidos en {{ catalogue.categories()!.length }} departamentos
              } @else {
                Abriendo las puertas…
              }
            </p>
            <ol class="dir-list" role="list">
              @for (c of catalogue.categories() ?? []; track c.id; let i = $index) {
                <li>
                  <a routerLink="/wishlist" [queryParams]="{ categoria: c.slug }">
                    <span class="floor tabular" aria-hidden="true">{{ floor(i) }}</span>
                    <span class="dept">{{ c.name }}</span>
                    <span class="leader" aria-hidden="true"></span>
                    <span class="count tabular"><span class="sr-only">, </span>{{ catalogue.countIn(c.id) }}<span class="sr-only"> regalos</span></span>
                  </a>
                </li>
              } @empty {
                @if (!catalogue.loaded()) {
                  @for (s of [0, 1, 2, 3, 4, 5]; track s) {
                    <li class="dir-skel" aria-hidden="true"></li>
                  }
                }
              }
            </ol>
          </div>
        </div>
      </section>

      <section class="windows" aria-labelledby="win-h">
        <div class="wrap">
          <div class="head">
            <h2 id="win-h">En el escaparate</h2>
            <a class="textlink" routerLink="/wishlist">Ver toda la wishlist</a>
          </div>
          <app-gift-grid [gifts]="favorites()" [categories]="catalogue.categories()" [mine]="catalogue.mine()" [eagerCount]="0" [skeletonCount]="4">
            <p empty class="empty">Todavía no hay favoritos en el escaparate. <a routerLink="/wishlist">Ver la wishlist</a></p>
          </app-gift-grid>
        </div>
      </section>
    }
  `,
  styles: `
    .intro {
      padding-block: clamp(96px, 12vw, 180px);
      text-align: center;
    }
    .intro-in {
      max-width: 820px;
    }
    .intro h2 {
      margin: 0 0 28px;
      font: italic 400 clamp(32px, 4.4vw, 60px) / 1.12 var(--font-serif);
      color: var(--color-burgundy);
    }
    .intro p {
      margin: 0 auto 18px;
      max-width: 36rem;
      font-size: 18px;
      line-height: 1.65;
    }
    .lists {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
      gap: 16px;
      margin: 36px auto 28px;
      padding: 0;
      max-width: 40rem;
      list-style: none;
    }
    .list-card {
      display: grid;
      justify-items: center;
      gap: 10px;
      min-height: 152px;
      align-content: center;
      padding: 28px 20px;
      border: 1px solid var(--color-gold);
      outline: 1px solid var(--color-line);
      outline-offset: 5px;
      background: var(--color-ivory);
      color: var(--color-burgundy);
      text-decoration: none;
      transition:
        background-color 220ms ease,
        color 220ms ease;
    }
    .list-eyebrow {
      font: italic 400 16px/1 var(--font-serif);
      color: var(--color-ink-soft);
    }
    .list-name {
      font: 400 clamp(30px, 3.6vw, 40px) / 1 var(--font-display);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .list-count {
      font: 500 12px/1 var(--font-sans);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
    }
    @media (hover: hover) and (pointer: fine) {
      a.list-card:hover {
        background: var(--color-burgundy);
        color: var(--color-ivory);
      }
      a.list-card:hover .list-eyebrow,
      a.list-card:hover .list-count {
        color: var(--color-brass);
      }
    }
    .plaque-note {
      display: inline-block;
      margin-top: 8px !important;
      padding: 14px 20px;
      border: 1px solid var(--color-gold);
      font-size: 15px !important;
      color: var(--color-ink-soft);
    }

    .dir {
      padding-block: clamp(80px, 10vw, 140px);
      background: var(--color-night);
      color: var(--color-ivory);
      scroll-margin-top: 64px;
    }
    .board {
      max-width: 880px;
      margin-inline: auto;
      padding: clamp(28px, 5vw, 64px);
      border: 1px solid var(--color-gold);
      outline: 1px solid color-mix(in oklab, var(--color-gold) 45%, transparent);
      outline-offset: 8px;
      text-align: center;
    }
    .board h2 {
      margin: 0;
      font: 400 clamp(40px, 5vw, 64px) / 1 var(--font-display);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .board-sub {
      margin: 14px 0 40px;
      font: italic 400 17px/1.4 var(--font-serif);
      color: var(--color-parchment);
    }
    .dir-list {
      margin: 0;
      padding: 0;
      list-style: none;
      text-align: left;
    }
    .dir-list a {
      display: grid;
      grid-template-columns: 32px auto 1fr auto;
      align-items: baseline;
      gap: 14px;
      min-height: 56px;
      padding: 12px 0;
      color: inherit;
      text-decoration: none;
      border-bottom: 1px solid rgb(184 154 101 / 0.25);
    }
    .dir-skel {
      height: 56px;
      border-bottom: 1px solid rgb(184 154 101 / 0.25);
    }
    .floor {
      font: 500 13px/1 var(--font-sans);
      color: var(--color-brass);
    }
    .dept {
      font: 400 clamp(18px, 2.2vw, 26px) / 1.2 var(--font-serif);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      transition: color 200ms ease;
    }
    .leader {
      border-bottom: 1px dotted rgb(184 154 101 / 0.7);
      translate: 0 -5px;
    }
    .count {
      font: 400 16px/1 var(--font-sans);
      color: var(--color-parchment);
    }
    @media (hover: hover) and (pointer: fine) {
      .dir-list a:hover .dept {
        color: var(--color-brass);
      }
    }

    .windows {
      padding-block: clamp(96px, 12vw, 180px);
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px 32px;
      margin-bottom: clamp(40px, 6vw, 72px);
    }
    .head h2 {
      margin: 0;
      font: 400 clamp(40px, 4.6vw, 64px) / 1 var(--font-display);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .textlink {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      font: 500 12px/1 var(--font-sans);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      text-underline-offset: 6px;
    }
    .empty {
      font: italic 400 18px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
  `,
})
export class Home {
  readonly session = inject(Session);
  readonly catalogue = inject(Catalogue);
  /** Up to four favourites; null while loading (skeleton). */
  readonly favorites = computed(() => (this.catalogue.gifts() ? this.catalogue.favorites().slice(0, 4) : null));
  floor(i: number) {
    return FLOORS[i] ?? String(i);
  }
}
