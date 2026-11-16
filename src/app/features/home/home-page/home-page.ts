import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { Session } from '@app/core/auth/session';
import { GiftGrid } from '@app/design-system/gift/gift-grid/gift-grid';
import { Reveal } from '@app/design-system/motion/reveal';
import { Hero } from '../hero/hero';

const FLOORS = ['G', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * HOME. Visitors without a session see the hero and the introduction only: no gift data
 * is requested (the database would refuse it anyway). Signed in: directory + favourites.
 * The hero's button goes straight to where it should (/login or /wishlist). Each block below
 * makes its entrance once, when it is actually seen (appReveal).
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, Hero, GiftGrid, Reveal],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  protected readonly session = inject(Session);
  protected readonly catalogue = inject(Catalogue);

  /** Up to four favourites; null while loading (skeleton). */
  protected readonly favorites = computed(() =>
    this.catalogue.gifts() ? this.catalogue.favorites().slice(0, 4) : null,
  );
  protected floor(i: number) {
    return FLOORS[i] ?? String(i);
  }
}
