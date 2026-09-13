import { Component, DestroyRef, OnInit, inject, signal, computed, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { interval, startWith, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { UiStatusService } from '../../../core/services/ui-status.service';
import { NotificationsService } from '../../../features/notifications/services/notifications.service';
import { AppNotification } from '../../../core/models/notification.model';
import { notificationIcon, relativeTime } from '../../../features/notifications/notification-display.util';

const UNREAD_POLL_MS = 45_000;
const PREVIEW_LIMIT = 6;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  private readonly authService         = inject(AuthService);
  private readonly router              = inject(Router);
  private readonly uiStatus            = inject(UiStatusService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly destroyRef          = inject(DestroyRef);

  @Input() sidebarOpen = true;
  @Output() sidebarToggle = new EventEmitter<void>();

  readonly profileOpen = signal(false);
  readonly chatOpen     = this.uiStatus.chatOpen;

  readonly notifOpen         = signal(false);
  readonly unreadCount       = signal(0);
  readonly recentNotifications = signal<AppNotification[]>([]);
  readonly notifLoading      = signal(false);
  readonly notifBadge        = computed(() => this.unreadCount() > 9 ? '9+' : String(this.unreadCount()));

  readonly notificationIcon = notificationIcon;
  readonly relativeTime     = relativeTime;

  private readonly user = signal(this.authService.getCurrentUserValue());

  readonly userName     = computed(() => this.user()?.full_name ?? 'Usuario');
  readonly userEmail    = computed(() => this.user()?.email ?? '');
  readonly userRole     = computed(() => {
    const role = this.user()?.role;
    if (role === 'superadmin') return 'Super Admin';
    if (role === 'admin')      return 'Administrador';
    return 'Usuario';
  });
  readonly userInitials = computed(() => {
    const name = this.user()?.full_name ?? '';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U';
  });
  readonly companyName = computed(() =>
    this.authService.selectedCompany()?.name ?? 'KnowledgeSpace'
  );

  ngOnInit(): void {
    // Refresca el contador de no leídas periódicamente para que la campanita
    // se mantenga al día sin que el usuario tenga que refrescar la página.
    interval(UNREAD_POLL_MS)
      .pipe(startWith(0), switchMap(() => this.notificationsService.getUnreadCount()), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: ({ count }) => this.unreadCount.set(count), error: () => {} });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.profileOpen.set(false);
    this.notifOpen.set(false);
  }

  toggleProfile(event: Event): void {
    event.stopPropagation();
    this.notifOpen.set(false);
    this.profileOpen.update(v => !v);
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.profileOpen.set(false);
    const opening = !this.notifOpen();
    this.notifOpen.set(opening);
    if (opening) this.loadRecentNotifications();
  }

  private loadRecentNotifications(): void {
    this.notifLoading.set(true);
    this.notificationsService.list({ limit: PREVIEW_LIMIT })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => { this.recentNotifications.set(list); this.notifLoading.set(false); },
        error: () => this.notifLoading.set(false)
      });
  }

  markAsRead(notification: AppNotification, event: Event): void {
    event.stopPropagation();
    if (notification.read) return;
    this.recentNotifications.update(list =>
      list.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    this.unreadCount.update(c => Math.max(0, c - 1));
    this.notificationsService.markAsRead(notification.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    if (this.unreadCount() === 0) return;
    this.notificationsService.markAllAsRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.recentNotifications.update(list => list.map(n => ({ ...n, read: true })));
          this.unreadCount.set(0);
        },
        error: () => {}
      });
  }

  toggleChatDrawer(): void {
    this.uiStatus.toggleChat();
  }

  onToggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
