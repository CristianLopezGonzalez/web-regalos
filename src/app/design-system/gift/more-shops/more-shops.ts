import { Component, computed, input } from '@angular/core';

/** "amazon.es" from "https://www.amazon.es/…"; the whole link if it can't be read. */
export function shopName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** "También en: amazon.es · elcorteingles.es" — the extra shop links of a gift. Nothing if none. */
@Component({
  selector: 'app-more-shops',
  templateUrl: './more-shops.html',
  styleUrl: './more-shops.css',
})
export class MoreShops {
  readonly urls = input<string[]>([]);
  protected readonly links = computed(() =>
    this.urls().map((url) => ({ url, name: shopName(url) })),
  );
}
