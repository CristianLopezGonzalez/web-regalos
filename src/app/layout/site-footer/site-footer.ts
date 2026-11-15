import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DEMO_PHOTO_CREDITS } from '@app/core/demo/demo-data';
import { Session } from '@app/core/auth/session';
import { Toasts } from '@app/core/toast/toasts';
import { WishlistApi } from '@app/core/api/wishlist-api';

/** The street at night: the name large in Italiana, the promise of anonymity, the exits. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
})
export class SiteFooter {
  protected readonly session = inject(Session);
  protected readonly api = inject(WishlistApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  protected readonly credits = DEMO_PHOTO_CREDITS;

  protected async signOut() {
    await this.api.signOut();
    this.toasts.show('Has cerrado sesión.');
    void this.router.navigateByUrl('/');
  }
}
