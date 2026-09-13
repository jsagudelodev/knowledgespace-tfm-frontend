import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../shared/layouts/dashboard-layout/dashboard-layout.component';
import { ChatShellComponent } from './pages/chat-shell/chat-shell.component';

export const CHAT_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: '',
        component: ChatShellComponent,
        children: [
          {
            path: ':id',
            loadComponent: () => import('./pages/chat-detail/chat-detail.component').then(m => m.ChatDetailComponent)
          }
        ]
      }
    ]
  }
];
