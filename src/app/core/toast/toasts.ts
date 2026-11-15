import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class Toasts {
  readonly items = signal<ToastItem[]>([]);
  private next = 1;

  show(text: string, tone: ToastItem['tone'] = 'info', ms = 4200) {
    const id = this.next++;
    this.items.update((l) => [...l.slice(-2), { id, text, tone }]);
    setTimeout(() => this.dismiss(id), tone === 'error' ? ms + 2000 : ms);
  }
  success(text: string) {
    this.show(text, 'success');
  }
  error(text: string) {
    this.show(text, 'error');
  }
  dismiss(id: number) {
    this.items.update((l) => l.filter((t) => t.id !== id));
  }
}
