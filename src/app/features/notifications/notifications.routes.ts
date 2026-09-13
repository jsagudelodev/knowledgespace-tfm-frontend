import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../shared/layouts/dashboard-layout/dashboard-layout.component';

export const NOTIFICATIONS_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/notification-list/notification-list.component').then(m => m.NotificationListComponent)
      }
    ]
  }
];
