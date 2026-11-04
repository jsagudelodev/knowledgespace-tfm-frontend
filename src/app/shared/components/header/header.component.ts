import { Component, DestroyRef, OnInit, inject, signal, computed, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { interval, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { UiStatusService } from '../../../core/services/ui-status.service';
import { NotificationsService } from '../../../features/notifications/services/notifications.service';
import { AppNotification } from '../../../core/models/notification.model';
import {
  notificationAction, notificationIcon, notificationMessage, relativeTime,
} from '../../../features/notifications/notification-display.util';
import { CompanyService } from '../../../features/companies/services/company.service';
import { Company } from '../../../core/models/company.model';

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
  private readonly companyService      = inject(CompanyService);
  private readonly destroyRef          = inject(DestroyRef);

  @Input() sidebarOpen = true;
  @Output() sidebarToggle = new EventEmitter<void>();

  readonly profileOpen = signal(false);
  readonly chatOpen     = this.uiStatus.chatOpen;

  readonly notifOpen         = signal(false);
  readonly unreadCount       = this.notificationsService.unreadCount;
  readonly recentNotifications = signal<AppNotification[]>([]);
  readonly notifLoading      = signal(false);
  readonly notifBadge        = computed(() => this.unreadCount() > 9 ? '9+' : String(this.unreadCount()));

  readonly notificationIcon = notificationIcon;
  readonly notificationMessage = notificationMessage;
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

  /**
   * Selector de empresa activa — solo para `superadmin` (2026-10-25).
   *
   * Hoy solo cambia de contexto para Documentos y Asistentes (ver
   * `get_company_context` en el backend); el resto de módulos sigue
   * mostrando los datos del propio superadmin aunque se elija otra empresa.
   * Por eso el desplegable avisa de esa limitación en vez de dar a entender
   * que cambia la vista entera.
   */
  readonly isSuperadmin     = computed(() => this.user()?.role === 'superadmin');
  readonly ownCompanyId     = computed(() => this.user()?.company_id ?? null);
  readonly companyMenuOpen  = signal(false);
  readonly companies        = signal<Company[]>([]);
  readonly companiesLoading = signal(false);
  readonly companiesError   = signal(false);
  readonly selectedCompanyId = computed(() => this.authService.selectedCompany()?.id ?? null);

  ngOnInit(): void {
    // Refresca el contador de no leídas periódicamente para que la campanita
    // se mantenga al día sin que el usuario tenga que refrescar la página.
    interval(UNREAD_POLL_MS)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.notificationsService.refreshUnreadCount());
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.profileOpen.set(false);
    this.notifOpen.set(false);
    this.companyMenuOpen.set(false);
  }

  toggleCompanyMenu(event: Event): void {
    if (!this.isSuperadmin()) return;
    event.stopPropagation();
    this.profileOpen.set(false);
    this.notifOpen.set(false);
    const opening = !this.companyMenuOpen();
    this.companyMenuOpen.set(opening);
    if (opening && this.companies().length === 0) this.loadCompanies();
  }

  private loadCompanies(): void {
    this.companiesLoading.set(true);
    this.companiesError.set(false);
    this.companyService.getCompanies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => { this.companies.set(list); this.companiesLoading.set(false); },
        error: () => { this.companiesLoading.set(false); this.companiesError.set(true); },
      });
  }

  /** Cambia la empresa activa y recarga: es la forma más simple de que TODOS
   * los servicios ya cargados —dashboard, listas con datos en memoria—
   * vuelvan a pedir con la cabecera nueva, en vez de dejar pantallas a medio
   * refrescar. */
  selectCompany(company: Company): void {
    this.companyMenuOpen.set(false);
    if (company.id === this.selectedCompanyId()) return;
    this.authService.setSelectedCompany(company);
    window.location.reload();
  }

  /** Vuelve a la empresa propia del superadmin — sale del modo "viendo como".
   * Pide `/companies/me` en vez de buscarla en `companies()`: esa lista solo
   * existe si el desplegable ya se abrió al menos una vez. */
  clearCompanyContext(): void {
    this.companyService.getMyCompany()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (own) => this.selectCompany(own), error: () => {} });
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
    if (!notification.read) {
      this.recentNotifications.update(list =>
        list.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      this.notificationsService.markAsRead(notification.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => {} });
    }
    // Mismo destino que en la página de Notificaciones.
    const action = notificationAction(notification);
    if (action) {
      this.notifOpen.set(false);
      this.router.navigate(action.commands);
    }
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    if (this.unreadCount() === 0) return;
    this.notificationsService.markAllAsRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.recentNotifications.update(list => list.map(n => ({ ...n, read: true })));
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
