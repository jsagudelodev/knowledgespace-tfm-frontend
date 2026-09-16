import {
  Component, inject, signal, computed,
  ViewEncapsulation, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { UiStatusService } from '../../../core/services/ui-status.service';
import { HeaderComponent } from '../../components/header/header.component';
import { ToastHostComponent } from '../../components/toast-host/toast-host.component';
import { ChatDetailComponent } from '../../../features/chat/pages/chat-detail/chat-detail.component';
import { NotificationsService } from '../../../features/notifications/services/notifications.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, HeaderComponent, ToastHostComponent, ChatDetailComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLayoutComponent {
  private readonly authService    = inject(AuthService);
  private readonly router         = inject(Router);
  private readonly uiStatus       = inject(UiStatusService);
  private readonly notificationsSvc = inject(NotificationsService);

  // ── Chat drawer — puente signal → getter/setter ───────────────────────────
  get chatDrawerVisible(): boolean { return this.uiStatus.chatOpen(); }
  set chatDrawerVisible(v: boolean) { v ? this.uiStatus.openChat() : this.uiStatus.closeChat(); }

  readonly sidebarOpen         = signal(true);
  readonly notifUnreadCount    = signal(0);

  readonly groupConocimiento   = signal(true);
  readonly groupPlataforma     = signal(false);
  readonly groupAdministracion = signal(true);
  readonly groupAnalytics      = signal(false);

  private readonly currentUrl = signal(this.router.url);

  readonly isFullHeightRoute = computed(() =>
    this.currentUrl().startsWith('/chat')
  );

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(e => this.currentUrl.set(e.urlAfterRedirects));

    this.notificationsSvc.getUnreadCount()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: ({ count }) => this.notifUnreadCount.set(count), error: () => {} });
  }

  private readonly user = signal(this.authService.getCurrentUserValue());

  readonly userName     = computed(() => this.user()?.full_name ?? 'Usuario');
  readonly userInitials = computed(() => {
    const name = this.user()?.full_name ?? '';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U';
  });
  readonly userRole = computed(() =>
    this.user()?.role === 'admin' ? 'Administrador' : 'Usuario'
  );
  readonly isAdmin = computed(() => {
    const role = this.user()?.role;
    return role === 'admin' || role === 'superadmin';
  });
  readonly isSuperadmin = computed(() => this.user()?.role === 'superadmin');

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
