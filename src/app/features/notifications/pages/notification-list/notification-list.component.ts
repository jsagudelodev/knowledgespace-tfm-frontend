import {
  Component, DestroyRef, OnInit, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificationsService } from '../../services/notifications.service';
import { AppNotification, NotificationCounts } from '../../../../core/models/notification.model';
import { notificationAction, notificationIcon, relativeTime } from '../../notification-display.util';

export type FilterMode = 'all' | 'unread' | 'documents' | 'budget' | 'knowledge_gap';

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
  { mode: 'budget',        label: 'Presupuesto',    countKey: 'budget'        },
  { mode: 'knowledge_gap', label: 'Sin respuesta',  countKey: 'knowledge_gap' },
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

  readonly chips        = CHIPS;
  readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7];

  readonly filter        = signal<FilterMode>('all');
  readonly notifications = signal<AppNotification[]>([]);
  readonly counts        = signal<NotificationCounts>({ todas: 0, unread: 0, documents: 0, budget: 0, knowledge_gap: 0 });
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

  private loadCounts(): void {
    this.svc.getCounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      case 'budget':        return { type: 'budget' };
      case 'knowledge_gap': return { type: 'knowledge' };
      default:              return {};
    }
  }

  load(reset: boolean): void {
    if (reset) {
      this.loading.set(true);
      this.error.set(false);
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
      this.counts.update(c => ({ ...c, unread: Math.max(0, c.unread - 1) }));
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
          this.counts.update(c => ({ ...c, unread: 0 }));
          this.markingAll.set(false);
          if (this.filter() === 'unread') this.load(true);
        },
        error: () => this.markingAll.set(false),
      });
  }

  readonly entityAction = notificationAction;

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
