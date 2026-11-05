import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AppNotification } from '../models/notification.model';
import { ChatDetailComponent } from '../../features/chat/pages/chat-detail/chat-detail.component';
import { NotificationListComponent } from '../../features/notifications/pages/notification-list/notification-list.component';
import { avisadoPorElInterceptor } from './error.interceptor';

// Las acciones del usuario fallaban en silencio cuando el backend las
// rechazaba con un 4xx. Ahora avisan, salvo que el interceptor ya lo haya
// hecho (red, 401, 403, 5xx): nunca dos avisos por el mismo fallo.
const http = (status: number) => new HttpErrorResponse({ status });
const ev = { stopPropagation: () => undefined } as Event;

describe('avisadoPorElInterceptor', () => {
  it('cubre red, sesión, permisos y servidor', () => {
    for (const s of [0, 401, 403, 500, 503]) expect(avisadoPorElInterceptor(http(s))).toBe(true);
  });

  it('deja los errores de negocio al componente', () => {
    for (const s of [400, 404, 409, 422]) expect(avisadoPorElInterceptor(http(s))).toBe(false);
  });
});

function listaConFallo(status: number) {
  const toasts = { error: vi.fn() };
  const c = Object.create(NotificationListComponent.prototype) as NotificationListComponent;
  Object.assign(c as unknown as Record<string, unknown>, {
    destroyRef: { onDestroy: () => () => undefined },
    svc: { bulk: () => throwError(() => http(status)), delete: () => throwError(() => http(status)) },
    toasts,
    notifications: signal([{ id: 1, read: true } as AppNotification]),
    selected: signal<ReadonlySet<number>>(new Set([1])),
    removingIds: signal<ReadonlySet<number>>(new Set()),
    selectMenuOpen: signal(false),
    confirmingDelete: signal(false),
    bulkBusy: signal(false),
  });
  return { c, toasts };
}

describe('Notificaciones · avisos de error', () => {
  it('un 404 al eliminar en bloque avisa y libera la barra', () => {
    const { c, toasts } = listaConFallo(404);
    c.bulkDelete();
    expect(toasts.error).toHaveBeenCalledWith('No se pudieron eliminar las notificaciones.');
    expect(c.bulkBusy()).toBe(false);
  });

  it('un 500 no avisa dos veces: ya lo hizo el interceptor', () => {
    const { c, toasts } = listaConFallo(500);
    c.bulkDelete();
    expect(toasts.error).not.toHaveBeenCalled();
  });

  it('un 404 con la papelera avisa', () => {
    const { c, toasts } = listaConFallo(404);
    c.remove({ id: 1, read: true } as AppNotification, ev);
    expect(toasts.error).toHaveBeenCalledWith('No se pudo eliminar la notificación.');
  });
});

describe('Chat · calificar una respuesta', () => {
  it('si el backend la rechaza, avisa en vez de no hacer nada', () => {
    const toasts = { error: vi.fn() };
    const c = Object.create(ChatDetailComponent.prototype) as ChatDetailComponent;
    Object.assign(c as unknown as Record<string, unknown>, {
      destroyRef: { onDestroy: () => () => undefined },
      feedbackService: { submit: () => throwError(() => http(422)) },
      toasts,
      messageFeedback: signal({}),
      assistantId: signal(1),
    });
    c.submitFeedback(7, 'up');
    expect(toasts.error).toHaveBeenCalledWith('No se pudo guardar la calificación.');
  });
});
