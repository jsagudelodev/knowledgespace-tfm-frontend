import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AppNotification, NotificationCounts, NotificationListParams } from '../../../core/models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly basePath = '/v1/notifications';
  private readonly api = inject(ApiService);

  // Un solo contador de no leídas para toda la app: la campana y el menú lateral
  // tenían el suyo cada uno, y marcar como leídas desde /notifications no movía
  // ninguno de los dos hasta el siguiente sondeo.
  private readonly _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe({ next: ({ count }) => this._unreadCount.set(count), error: () => {} });
  }

  list(params: NotificationListParams = {}): Observable<AppNotification[]> {
    return this.api.get<AppNotification[]>(`${this.basePath}/`, {
      read: params.read,
      type: params.type,
      skip: params.skip ?? 0,
      limit: params.limit ?? 20,
    });
  }

  getCounts(): Observable<NotificationCounts> {
    return this.api.get<NotificationCounts>(`${this.basePath}/counts`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.api.get<{ count: number }>(`${this.basePath}/unread-count`);
  }

  /** Solo para notificaciones no leídas: descuenta una del contador compartido. */
  markAsRead(id: number): Observable<AppNotification> {
    return this.api.patch<AppNotification>(`${this.basePath}/${id}/read`, {}).pipe(
      tap(() => this._unreadCount.update(c => Math.max(0, c - 1))),
    );
  }

  markAllAsRead(): Observable<{ updated: number }> {
    return this.api.post<{ updated: number }>(`${this.basePath}/read-all`, {}).pipe(
      tap(() => this._unreadCount.set(0)),
    );
  }
}
