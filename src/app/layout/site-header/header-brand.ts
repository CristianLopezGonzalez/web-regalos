import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/**
 * The header's small "My Christmas Wishlist" steps aside while the home page's big title is on
 * screen (same words twice, one above the other, took the title's thunder). The home hero drives
 * it; everywhere else the name is always shown.
 */
@Injectable({ providedIn: 'root' })
export class HeaderBrand {
  /**
   * True while the hero title is visible. Starts true on a direct load of the home page so the
   * name does not flash in and fade out while the home chunk loads.
   */
  readonly away = signal(inject(DOCUMENT).location?.pathname === '/');
}
