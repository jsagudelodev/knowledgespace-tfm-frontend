import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../shared/layouts/dashboard-layout/dashboard-layout.component';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/document-list/document-list.component').then(m => m.DocumentListComponent)
      },
      {
        path: 'upload',
        loadComponent: () => import('./pages/document-upload/document-upload.component').then(m => m.DocumentUploadComponent)
      }
    ]
  }
];
