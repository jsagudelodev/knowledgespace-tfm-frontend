import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppNotification } from '../../core/models/notification.model';
import { ApiService } from '../../core/services/api.service';
import { notificationMessage } from './notification-display.util';
import { NotificationsService } from './services/notifications.service';

function aviso(type: string, title: string, message: string, read = false): AppNotification {
  return { id: 7, title, message, read, notification_type: { name: type } } as AppNotification;
}

// Cada usuario limpia su bandeja: una a una, o las leídas de golpe.
describe('NotificationsService · borrado', () => {
  let svc: NotificationsService;
  const api = {
    get: vi.fn(() => of({ count: 3 })),
    delete: vi.fn(() => of({})),
    post: vi.fn(() => of({ affected: 2 })),
  };

  beforeEach(() => {
    api.delete.mockClear();
    api.post.mockClear();
    TestBed.configureTestingModule({
      providers: [NotificationsService, { provide: ApiService, useValue: api }],
    });
    svc = TestBed.inject(NotificationsService);
    svc.refreshUnreadCount();
  });

  it('borrar una no leída descuenta del contador de la campana', () => {
    svc.delete(aviso('document_processed', 't', 'm', false)).subscribe();
    expect(api.delete).toHaveBeenCalledWith('/v1/notifications/7');
    expect(svc.unreadCount()).toBe(2);
  });

  it('borrar una ya leída no toca el contador', () => {
    svc.delete(aviso('document_processed', 't', 'm', true)).subscribe();
    expect(svc.unreadCount()).toBe(3);
  });

  it('la acción en bloque envía los ids elegidos y refresca la campana', () => {
    api.get.mockClear();
    svc.bulk([4, 9], 'delete').subscribe();
    expect(api.post).toHaveBeenCalledWith('/v1/notifications/bulk', { ids: [4, 9], action: 'delete' });
    expect(api.get).toHaveBeenCalledWith('/v1/notifications/unread-count');
  });
});

describe('Notificaciones · textos', () => {
  it('un documento fallido antiguo no muestra el error técnico', () => {
    const n = aviso('document_failed', 'Error', '"a.pdf" no pudo procesarse: Error descargando archivo de S3: NoSuchKey');
    expect(notificationMessage(n)).toBe('"a.pdf" no se pudo procesar. Puedes reintentarlo desde Documentos.');
  });
});
