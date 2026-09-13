import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  message: string;
}

const DEFAULT_DURATION_MS = 4000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _items = signal<NotificationItem[]>([]);
  private nextId = 0;

  readonly items = this._items.asReadonly();

  show(message: string, type: NotificationType = 'info', duration = DEFAULT_DURATION_MS): void {
    const id = this.nextId++;
    this._items.update(items => [...items, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  dismiss(id: number): void {
    this._items.update(items => items.filter(item => item.id !== id));
  }
}
