import { Component, input } from '@angular/core';

/** Title + one-line purpose + optional actions, shared by every back-office page. */
@Component({
  selector: 'app-admin-page-head',
  host: { class: 'block' },
  templateUrl: './admin-page-head.html',
  styleUrl: './admin-page-head.css',
})
export class AdminPageHead {
  readonly heading = input.required<string>();
  readonly lede = input<string | null>(null);
}
