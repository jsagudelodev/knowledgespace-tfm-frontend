import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../shared/layouts/dashboard-layout/dashboard-layout.component';
import { adminGuard } from '../../core/guards/admin.guard';

export const ASSISTANTS_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/assistant-list/assistant-list.component')
          .then(m => m.AssistantListComponent)
      },
      {
        path: 'new',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/assistant-form/assistant-form.component')
          .then(m => m.AssistantFormComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/assistant-detail/assistant-detail.component')
          .then(m => m.AssistantDetailComponent)
      },
      {
        path: ':id/edit',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/assistant-form/assistant-form.component')
          .then(m => m.AssistantFormComponent)
      }
    ]
  }
];
