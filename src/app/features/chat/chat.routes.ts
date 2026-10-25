import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../shared/layouts/dashboard-layout/dashboard-layout.component';

// El chat en vivo se usa desde el drawer global (ver DashboardLayoutComponent),
// no como página completa — ChatShellComponent y ChatListComponent se
// quitaron por ser redundantes con el drawer. Esta ruta sobrevive solo para
// que enlaces existentes a una conversación puntual (p. ej. "Ver conversación"
// desde Feedback) sigan resolviendo a algo, mostrando ChatDetailComponent
// directo dentro del layout del dashboard.
export const CHAT_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      // `/chat` a secas no tiene página propia y mostraba el layout en blanco.
      // El chat se abre desde el botón "Chat IA" de la cabecera, presente en
      // el dashboard.
      { path: '', pathMatch: 'full', redirectTo: '/dashboard' },
      {
        path: ':id',
        loadComponent: () => import('./pages/chat-detail/chat-detail.component').then(m => m.ChatDetailComponent)
      }
    ]
  }
];
