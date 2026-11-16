import { Directive, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStage } from './auth-stage';

/**
 * `<a authLink="/register">`: a real link (href, open in a new tab, copy) that, on a plain click,
 * changes screen behind the envelope: it closes, the view changes, it opens again.
 * Not RouterLink because RouterLink would navigate at once, before the envelope has closed.
 */
@Directive({
  selector: 'a[authLink]',
  host: { '[attr.href]': 'authLink()', '(click)': 'onClick($event)' },
})
export class AuthLink {
  private readonly router = inject(Router);
  private readonly stage = inject(AuthStage);

  /** An app URL, query included (build it with Router.createUrlTree + serializeUrl). */
  readonly authLink = input.required<string>();

  protected onClick(e: MouseEvent) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const url = this.authLink();
    this.stage.go(() => this.router.navigateByUrl(url));
  }
}
