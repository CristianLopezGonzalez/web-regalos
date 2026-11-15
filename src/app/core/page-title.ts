import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/** "Página · My Christmas Wishlist" */
@Injectable()
export class PageTitle extends TitleStrategy {
  private readonly title = inject(Title);
  override updateTitle(snapshot: RouterStateSnapshot) {
    const t = this.buildTitle(snapshot);
    this.title.setTitle(t ? `${t} · My Christmas Wishlist` : 'My Christmas Wishlist');
  }
}
