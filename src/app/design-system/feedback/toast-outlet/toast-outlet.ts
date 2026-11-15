import { Component, inject } from '@angular/core';
import { Toasts } from '@app/core/toast/toasts';

/** Bottom-centred status messages in a polite live region. */
@Component({
  selector: 'app-toast-outlet',
  templateUrl: './toast-outlet.html',
  styleUrl: './toast-outlet.css',
})
export class ToastOutlet {
  protected readonly toasts = inject(Toasts);
}
