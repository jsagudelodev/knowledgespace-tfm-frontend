import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AppNotification, NotificationCounts, NotificationListParams } from '../../../core/models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly basePath = '/v1/notifications';
  private readonly api = inject(ApiService);

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

  markAsRead(id: number): Observable<AppNotification> {
    return this.api.patch<AppNotification>(`${this.basePath}/${id}/read`, {});
  }

  markAllAsRead(): Observable<{ updated: number }> {
    return this.api.post<{ updated: number }>(`${this.basePath}/read-all`, {});
  }
}
