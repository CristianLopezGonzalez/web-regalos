import { Component, computed, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { GiftDetail } from '@app/design-system/gift/gift-detail/gift-detail';

/** /wishlist/:id */
@Component({
  selector: 'app-gift-page',
  imports: [RouterLink, GiftDetail],
  templateUrl: './gift-page.html',
  styleUrl: './gift-page.css',
})
export class GiftPage {
  protected readonly catalogue = inject(Catalogue);
  private readonly title = inject(Title);

  readonly id = input.required<string>();

  protected readonly gift = computed(() => this.catalogue.gift(this.id()));

  protected readonly backLabel = computed(() => {
    const l = this.catalogue.list(this.gift()?.forId);
    return l
      ? `Volver a ${l.id === this.catalogue.meId() ? 'tu lista' : 'la lista de ' + l.name}`
      : 'Volver a la wishlist';
  });

  constructor() {
    effect(() => {
      const g = this.gift();
      if (g) this.title.setTitle(`${g.name} · My Christmas Wishlist`);
    });
  }
}
