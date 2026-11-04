import { computed, signal } from '@angular/core';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AppNotification } from '../../../../core/models/notification.model';
import { NotificationListComponent } from './notification-list.component';

// Selección al estilo Gmail: casillas por aviso, menú Todas/Leídas/No leídas/
// Ninguna y acciones sobre lo elegido.
function aviso(id: number, read: boolean): AppNotification {
  return { id, read, title: 't', message: 'm', notification_type: { name: 'document_processed' } } as AppNotification;
}

const ev = { stopPropagation: () => undefined } as Event;

function montar(lista: AppNotification[]) {
  const bulk = vi.fn(() => of({ affected: 1 }));
  const c = Object.create(NotificationListComponent.prototype) as NotificationListComponent;
  const ctx = c as unknown as Record<string, unknown>;
  Object.assign(ctx, {
    destroyRef: { onDestroy: () => () => undefined },
    svc: { bulk, getCounts: () => of({}) },
    filter: signal('all'),
    notifications: signal(lista),
    counts: signal({}),
    selected: signal<ReadonlySet<number>>(new Set()),
    selectMenuOpen: signal(false),
    confirmingDelete: signal(false),
    bulkBusy: signal(false),
  });
  ctx['selectedCount'] = computed(() => c.selected().size);
  ctx['allSelected'] = computed(() =>
    c.notifications().length > 0 && c.selected().size === c.notifications().length);
  return { c, bulk };
}

describe('NotificationListComponent · selección', () => {
  it('el menú elige leídas o no leídas', () => {
    const { c } = montar([aviso(1, true), aviso(2, false), aviso(3, true)]);
    c.selectBy('read');
    expect([...c.selected()]).toEqual([1, 3]);
    c.selectBy('unread');
    expect([...c.selected()]).toEqual([2]);
    c.selectBy('none');
    expect(c.selected().size).toBe(0);
  });

  it('la casilla general marca todas y, si ya hay algo marcado, lo quita', () => {
    const { c } = montar([aviso(1, true), aviso(2, false)]);
    c.toggleSelectAll();
    expect(c.allSelected()).toBe(true);
    c.toggleSelect(aviso(1, true), ev);
    c.toggleSelectAll();
    expect(c.selected().size).toBe(0);
  });

  it('eliminar varias pide confirmación antes de llamar al backend', () => {
    const { c, bulk } = montar([aviso(1, true), aviso(2, true), aviso(3, false)]);
    c.selectBy('read');
    c.bulkDelete();
    expect(bulk).not.toHaveBeenCalled();
    expect(c.confirmingDelete()).toBe(true);

    c.bulkDelete();
    expect(bulk).toHaveBeenCalledWith([1, 2], 'delete');
    expect(c.notifications().map(n => n.id)).toEqual([3]);
    expect(c.selected().size).toBe(0);
  });

  it('una sola se elimina sin preguntar', () => {
    const { c, bulk } = montar([aviso(1, true), aviso(2, true)]);
    c.toggleSelect(aviso(2, true), ev);
    c.bulkDelete();
    expect(bulk).toHaveBeenCalledWith([2], 'delete');
  });

  it('marcar como leídas actualiza la lista sin recargar', () => {
    const { c, bulk } = montar([aviso(1, false), aviso(2, false)]);
    c.selectBy('all');
    c.bulkMarkRead();
    expect(bulk).toHaveBeenCalledWith([1, 2], 'read');
    expect(c.notifications().every(n => n.read)).toBe(true);
  });
});
