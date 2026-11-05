import {
  Component, DestroyRef, ElementRef, HostListener, OnInit, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificationsService } from '../../services/notifications.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { avisadoPorElInterceptor } from '../../../../core/interceptors/error.interceptor';
import { AppNotification, NotificationCounts } from '../../../../core/models/notification.model';
import {
  notificationAction, notificationIcon, notificationMessage, relativeTime,
} from '../../notification-display.util';

// Sin "Presupuesto": el módulo está fuera de alcance (ALCANCE_TFM.md del backend)
// y su único aviso es un resto de junio de 2026. Sin "Sin respuesta" (2026-11-04):
// esos avisos los creaba la acción de un admin y le llegaban a él mismo, así que
// el backend ya no los emite, y la migración d9f1b3c5a7e2 borró los antiguos.
export type FilterMode = 'all' | 'unread' | 'documents';

interface ChipDef {
  mode: FilterMode;
  label: string;
  countKey: keyof NotificationCounts;
}

interface NotificationGroup {
  label: string;
  items: AppNotification[];
}

const CHIPS: ChipDef[] = [
  { mode: 'all',           label: 'Todas',          countKey: 'todas'         },
  { mode: 'unread',        label: 'No leídas',      countKey: 'unread'        },
  { mode: 'documents',     label: 'Documentos',     countKey: 'documents'     },
];

const PAGE_SIZE = 25;

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss'],
})
export class NotificationListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly svc        = inject(NotificationsService);
  private readonly router     = inject(Router);
  private readonly toasts     = inject(NotificationService);

  readonly chips        = CHIPS;
  readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7];

  readonly filter        = signal<FilterMode>('all');
  readonly notifications = signal<AppNotification[]>([]);
  readonly counts        = signal<NotificationCounts>({ todas: 0, unread: 0, read: 0, documents: 0, budget: 0 });
  readonly removingIds   = signal<ReadonlySet<number>>(new Set());

  // ── Selección al estilo Gmail ─────────────────────────────────────────
  // Solo sobre las cargadas en pantalla, y se vacía al cambiar de pestaña o
  // recargar: nunca se actúa sobre avisos que el usuario no está viendo.
  readonly selected         = signal<ReadonlySet<number>>(new Set());
  readonly selectMenuOpen   = signal(false);
  readonly confirmingDelete = signal(false);
  readonly bulkBusy         = signal(false);

  readonly selectedCount = computed(() => this.selected().size);
  readonly allSelected   = computed(() =>
    this.notifications().length > 0 && this.selected().size === this.notifications().length);
  readonly someSelected  = computed(() => this.selected().size > 0 && !this.allSelected());
  readonly selectedHasUnread = computed(() =>
    this.notifications().some(n => !n.read && this.selected().has(n.id)));
  readonly loading       = signal(true);
  readonly error         = signal(false);
  readonly loadingMore   = signal(false);
  readonly hasMore       = signal(false);
  readonly markingAll    = signal(false);

  readonly relativeTime     = relativeTime;
  readonly notificationIcon = notificationIcon;

  readonly groups = computed<NotificationGroup[]>(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    const buckets = { hoy: [] as AppNotification[], ayer: [] as AppNotification[], antes: [] as AppNotification[] };
    for (const n of this.notifications()) {
      const d = new Date(n.created_at); d.setHours(0, 0, 0, 0);
      if      (d.getTime() === today.getTime())     buckets.hoy.push(n);
      else if (d.getTime() === yesterday.getTime()) buckets.ayer.push(n);
      else                                           buckets.antes.push(n);
    }
    return [
      { label: 'Hoy',         items: buckets.hoy   },
      { label: 'Ayer',        items: buckets.ayer  },
      { label: 'Anteriores',  items: buckets.antes },
    ].filter(g => g.items.length > 0);
  });

  ngOnInit(): void {
    this.loadCounts();
    this.load(true);
  }

  private readonly el = inject(ElementRef);

  // El menú "Seleccionar" se cierra al hacer clic fuera o con Escape.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const menu = (this.el.nativeElement as HTMLElement).querySelector('.select-menu-wrap');
    if (menu && !menu.contains(event.target as Node)) this.selectMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.selectMenuOpen.set(false);
    this.confirmingDelete.set(false);
  }

  private loadCounts(): void {
    this.svc.getCounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      // Secundario: si falla, los chips se quedan con el último valor; red y
      // 5xx ya los avisa el interceptor.
      .subscribe({ next: c => this.counts.set(c), error: () => {} });
  }

  setFilter(mode: FilterMode): void {
    if (this.filter() === mode) return;
    this.filter.set(mode);
    this.load(true);
  }

  private listParams(): Record<string, unknown> {
    switch (this.filter()) {
      case 'unread':        return { read: false };
      case 'documents':     return { type: 'document' };
      default:              return {};
    }
  }

  load(reset: boolean): void {
    if (reset) {
      this.loading.set(true);
      this.error.set(false);
      this.clearSelection();
    } else {
      this.loadingMore.set(true);
    }

    const skip = reset ? 0 : this.notifications().length;

    this.svc.list({ ...this.listParams(), skip, limit: PAGE_SIZE } as never)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.notifications.set(reset ? page : [...this.notifications(), ...page]);
          this.hasMore.set(page.length === PAGE_SIZE);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadingMore.set(false);
          if (reset) this.error.set(true);
        },
      });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    this.load(false);
  }

  rowClick(n: AppNotification): void {
    if (!n.read) {
      this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, read: true } : x));
      this.counts.update(c => ({ ...c, unread: Math.max(0, c.unread - 1), read: c.read + 1 }));
      // Optimista: se marca en pantalla al abrirla. Si el servidor falla, el
      // interceptor avisa y al recargar vuelve a salir como no leída.
      this.svc.markAsRead(n.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => {} });
    }
    const action = this.entityAction(n);
    if (action) this.router.navigate(action.commands);
  }

  markAllAsRead(): void {
    if (this.markingAll()) return;
    this.markingAll.set(true);
    this.svc.markAllAsRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.update(list => list.map(n => ({ ...n, read: true })));
          this.counts.update(c => ({ ...c, read: c.read + c.unread, unread: 0 }));
          this.markingAll.set(false);
          if (this.filter() === 'unread') this.load(true);
        },
        error: () => this.markingAll.set(false),
      });
  }

  // ── Borrado: cada usuario limpia su bandeja ──────────────────────────

  /** Una sola, sin confirmación: es lo esperable al estilo correo, y solo
   *  afecta a la bandeja de quien la borra. */
  remove(n: AppNotification, event: Event): void {
    event.stopPropagation();
    if (this.removingIds().has(n.id)) return;
    this.removingIds.update(s => new Set(s).add(n.id));
    this.svc.delete(n)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.update(list => list.filter(x => x.id !== n.id));
          this.selected.update(s => { const next = new Set(s); next.delete(n.id); return next; });
          this.loadCounts();
          this.forgetRemoving(n.id);
        },
        error: (err) => {
          this.forgetRemoving(n.id);
          this.avisarFallo(err, 'No se pudo eliminar la notificación.');
        },
      });
  }

  private forgetRemoving(id: number): void {
    this.removingIds.update(s => { const next = new Set(s); next.delete(id); return next; });
  }

  // ── Selección y acciones en bloque ───────────────────────────────────

  isSelected(n: AppNotification): boolean {
    return this.selected().has(n.id);
  }

  toggleSelect(n: AppNotification, event: Event): void {
    event.stopPropagation();
    this.confirmingDelete.set(false);
    this.selected.update(s => {
      const next = new Set(s);
      if (next.has(n.id)) next.delete(n.id); else next.add(n.id);
      return next;
    });
  }

  /** La casilla general: si hay algo marcado lo quita; si no, marca todas. */
  toggleSelectAll(): void {
    this.selectBy(this.selected().size ? 'none' : 'all');
  }

  selectBy(kind: 'all' | 'read' | 'unread' | 'none'): void {
    this.selectMenuOpen.set(false);
    this.confirmingDelete.set(false);
    const pick = this.notifications().filter(n =>
      kind === 'all' ? true : kind === 'read' ? n.read : kind === 'unread' ? !n.read : false);
    this.selected.set(new Set(pick.map(n => n.id)));
  }

  clearSelection(): void {
    this.selected.set(new Set());
    this.selectMenuOpen.set(false);
    this.confirmingDelete.set(false);
  }

  bulkMarkRead(): void {
    const ids = [...this.selected()];
    if (!ids.length || this.bulkBusy()) return;
    this.bulkBusy.set(true);
    this.svc.bulk(ids, 'read')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const elegidas = new Set(ids);
          this.notifications.update(list =>
            this.filter() === 'unread'
              ? list.filter(n => !elegidas.has(n.id))
              : list.map(n => elegidas.has(n.id) ? { ...n, read: true } : n));
          this.afterBulk();
        },
        error: (err) => {
          this.bulkBusy.set(false);
          this.avisarFallo(err, 'No se pudieron marcar como leídas.');
        },
      });
  }

  /** Una sola se borra sin preguntar; varias, con confirmación. */
  bulkDelete(): void {
    const ids = [...this.selected()];
    if (!ids.length || this.bulkBusy()) return;
    if (ids.length > 1 && !this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    this.bulkBusy.set(true);
    this.svc.bulk(ids, 'delete')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const elegidas = new Set(ids);
          this.notifications.update(list => list.filter(n => !elegidas.has(n.id)));
          this.afterBulk();
        },
        error: (err) => {
          this.bulkBusy.set(false);
          this.avisarFallo(err, 'No se pudieron eliminar las notificaciones.');
        },
      });
  }

  /** Aviso para las acciones del usuario. Red, permisos y 5xx ya los muestra
   *  el interceptor: aquí solo el resto, para no avisar dos veces. */
  private avisarFallo(err: unknown, mensaje: string): void {
    if (!avisadoPorElInterceptor(err)) this.toasts.error(mensaje);
  }

  private afterBulk(): void {
    this.bulkBusy.set(false);
    this.clearSelection();
    this.loadCounts();
  }

  readonly entityAction = notificationAction;
  readonly message      = notificationMessage;

  typeColor(n: AppNotification): string {
    return n.notification_type.color ?? '#6B7280';
  }

  typeBg(n: AppNotification): string {
    return (n.notification_type.color ?? '#6B7280') + '1A';
  }

  typeIcon(n: AppNotification): string {
    return notificationIcon(n.notification_type.name);
  }
}
