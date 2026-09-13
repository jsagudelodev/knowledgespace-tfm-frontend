import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../shared/layouts/dashboard-layout/dashboard-layout.component';

export const WIDGETS_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/widget-list/widget-list.component').then(m => m.WidgetListComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/widget-detail/widget-detail.component').then(m => m.WidgetDetailComponent)
      }
    ]
  }
];
