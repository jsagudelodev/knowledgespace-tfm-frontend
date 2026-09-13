import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../shared/layouts/dashboard-layout/dashboard-layout.component';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/user-list/user-list.component').then(m => m.UserListComponent)
      }
    ]
  }
];
