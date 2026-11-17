import { Component, computed, input } from '@angular/core';

/** "amazon.es" from "https://www.amazon.es/…"; the whole link if it can't be read. */
export function shopName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Every shop link of a gift with the name its button shows: one link keeps "Ver en la tienda";
 * several are named after their shop ("jdsports.es"), numbered when a shop repeats.
 */
export function shopLinks(main: string | null, extras: string[] = []) {
  const urls = [main, ...extras].filter((u): u is string => !!u);
  if (urls.length === 1) return [{ url: urls[0], label: 'Ver en la tienda' }];
  const names = urls.map(shopName);
  const seen = new Map<string, number>();
  return urls.map((url, i) => {
    const name = names[i];
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    const repeated = names.filter((x) => x === name).length > 1;
    return { url, label: repeated ? `${name} · ${n}` : name };
  });
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
