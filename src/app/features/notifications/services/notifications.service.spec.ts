import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from '../../../core/services/api.service';
import { NotificationsService } from './notifications.service';

// La campana y el menú lateral tenían cada uno su contador de no leídas, y
// marcar como leídas desde /notifications no movía ninguno. Ahora es uno solo.
describe('NotificationsService · contador compartido de no leídas', () => {
  let svc: NotificationsService;
  const api = {
    get: vi.fn(() => of({ count: 5 })),
    patch: vi.fn(() => of({})),
    post: vi.fn(() => of({ updated: 5 })),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationsService, { provide: ApiService, useValue: api }],
    });
    svc = TestBed.inject(NotificationsService);
  });

  it('refrescar toma el valor del backend', () => {
    svc.refreshUnreadCount();
    expect(svc.unreadCount()).toBe(5);
  });

  it('marcar una como leída descuenta una', () => {
    svc.refreshUnreadCount();
    svc.markAsRead(1).subscribe();
    expect(svc.unreadCount()).toBe(4);
  });

  it('marcar todas deja el contador en cero', () => {
    svc.refreshUnreadCount();
    svc.markAllAsRead().subscribe();
    expect(svc.unreadCount()).toBe(0);
  });

  it('nunca baja de cero', () => {
    api.get.mockReturnValueOnce(of({ count: 0 }));
    svc.refreshUnreadCount();
    svc.markAsRead(1).subscribe();
    expect(svc.unreadCount()).toBe(0);
  });
});
