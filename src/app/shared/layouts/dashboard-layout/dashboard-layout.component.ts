/**
 * Marco de la aplicación autenticada: sidebar, header y `<router-outlet>`.
 *
 * **Dependencia cruzada asumida.** Este componente vive en `shared/` pero
 * importa dos cosas de `features/`: `ChatDetailComponent` y
 * `NotificationsService`. Va en el sentido "prohibido" —lo compartido no
 * debería conocer lo específico— y se aceptó por dos razones concretas:
 *
 * - El **drawer de chat** tiene que estar disponible desde cualquier módulo,
 *   así que se monta aquí de forma permanente. La alternativa —un servicio en
 *   `core/` que proyectara el componente— añadía indirección para un único
 *   caso de uso.
 * - El **contador de notificaciones no leídas** del sidebar necesita el
 *   servicio de ese módulo. Lo correcto sería centralizar el conteo en
 *   `core/`; se dejó así por ser suficiente para el alcance del trabajo.
 *
 * El contador vive en `NotificationsService` (un signal compartido con la
 * campana), así que marcar como leídas desde cualquier sitio actualiza los dos
 * badges a la vez (2026-11-02; antes cada uno tenía su propia copia).
 *
 * El estado del sidebar (`sidebarOpen`) y el de sus grupos colapsables ya
 * persisten entre navegaciones (2026-10-22), vía `StorageService`
 * (`sessionStorage`): cada módulo sigue instanciando su propia layout, pero
 * ahora arranca leyendo el último valor en vez de reiniciar siempre a su
 * estado por defecto.
 */
import {
  Component, inject, signal, computed, effect,
  ViewEncapsulation, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { StorageService } from '../../../core/services/storage.service';
import { UiStatusService } from '../../../core/services/ui-status.service';
import { HeaderComponent } from '../../components/header/header.component';
import { ToastHostComponent } from '../../components/toast-host/toast-host.component';
import { ChatDetailComponent } from '../../../features/chat/pages/chat-detail/chat-detail.component';
import { NotificationsService } from '../../../features/notifications/services/notifications.service';

// Claves de `sessionStorage` para el estado de la UI del layout. Con prefijo
// propio para no chocar con las que ya usan auth/empresa seleccionada.
const UI_STATE_KEYS = {
  sidebarOpen: 'ui_sidebar_open',
  groupConocimiento: 'ui_group_conocimiento',
  groupPlataforma: 'ui_group_plataforma',
  groupAdministracion: 'ui_group_administracion',
  groupAnalytics: 'ui_group_analytics'
} as const;

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
  private readonly storage        = inject(StorageService);

  // ── Chat drawer — puente signal → getter/setter ───────────────────────────
  get chatDrawerVisible(): boolean { return this.uiStatus.chatOpen(); }
  set chatDrawerVisible(v: boolean) {
    if (v) { this.uiStatus.openChat(); } else { this.uiStatus.closeChat(); }
  }

  // Se leen una vez al construir el layout; qué valor tenían antes de la
  // navegación que acaba de ocurrir, no el valor por defecto de la clase.
  readonly sidebarOpen         = signal(this.leerBooleano(UI_STATE_KEYS.sidebarOpen, true));
  // Mismo contador que la campana (lo sondea el header); ver NotificationsService.
  readonly notifUnreadCount    = this.notificationsSvc.unreadCount;

  readonly groupConocimiento   = signal(this.leerBooleano(UI_STATE_KEYS.groupConocimiento, true));
  readonly groupPlataforma     = signal(this.leerBooleano(UI_STATE_KEYS.groupPlataforma, false));
  readonly groupAdministracion = signal(this.leerBooleano(UI_STATE_KEYS.groupAdministracion, true));
  readonly groupAnalytics      = signal(this.leerBooleano(UI_STATE_KEYS.groupAnalytics, false));

  private readonly currentUrl = signal(this.router.url);

  readonly isFullHeightRoute = computed(() =>
    this.currentUrl().startsWith('/chat')
  );

  private leerBooleano(key: string, porDefecto: boolean): boolean {
    const guardado = this.storage.getItem<boolean>(key);
    return guardado === null ? porDefecto : guardado;
  }

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(e => this.currentUrl.set(e.urlAfterRedirects));

    // Un efecto por señal en vez de uno combinado: cada una se guarda bajo
    // su propia clave, y mezclarlas en un solo efecto obligaría a escribir
    // las cinco cada vez que cambia una sola.
    effect(() => this.storage.setItem(UI_STATE_KEYS.sidebarOpen, this.sidebarOpen()));
    effect(() => this.storage.setItem(UI_STATE_KEYS.groupConocimiento, this.groupConocimiento()));
    effect(() => this.storage.setItem(UI_STATE_KEYS.groupPlataforma, this.groupPlataforma()));
    effect(() => this.storage.setItem(UI_STATE_KEYS.groupAdministracion, this.groupAdministracion()));
    effect(() => this.storage.setItem(UI_STATE_KEYS.groupAnalytics, this.groupAnalytics()));
  }

  private readonly user = signal(this.authService.getCurrentUserValue());

  readonly userName     = computed(() => this.user()?.full_name ?? 'Usuario');
  readonly userInitials = computed(() => {
    const name = this.user()?.full_name ?? '';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U';
  });
  // Mismas etiquetas que la cabecera (`HeaderComponent.userRole`). Antes no
  // contemplaba `superadmin` y lo mostraba como "Usuario".
  readonly userRole = computed(() => {
    const role = this.user()?.role;
    if (role === 'superadmin') return 'Super Admin';
    if (role === 'admin')      return 'Administrador';
    return 'Usuario';
  });
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
