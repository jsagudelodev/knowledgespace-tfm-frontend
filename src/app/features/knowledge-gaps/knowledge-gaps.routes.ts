import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../shared/layouts/dashboard-layout/dashboard-layout.component';

export const KNOWLEDGE_GAPS_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/knowledge-gaps-list/knowledge-gaps-list.component').then(
            m => m.KnowledgeGapsListComponent,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/knowledge-gaps-list/knowledge-gaps-list.component').then(
            m => m.KnowledgeGapsListComponent,
          ),
      },
    ],
  },
];
