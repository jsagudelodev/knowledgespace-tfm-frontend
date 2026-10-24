import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
  },
  {
    path: 'companies',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./features/companies/companies.routes').then(m => m.COMPANIES_ROUTES)
  },
  {
    path: 'users',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES)
  },
  {
    path: 'tags',
    canActivate: [authGuard],
    loadChildren: () => import('./features/tags/tags.routes').then(m => m.TAGS_ROUTES)
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadChildren: () => import('./features/categories/categories.routes').then(m => m.CATEGORIES_ROUTES)
  },
  {
    path: 'documents',
    canActivate: [authGuard],
    loadChildren: () => import('./features/documents/documents.routes').then(m => m.DOCUMENTS_ROUTES)
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadChildren: () => import('./features/chat/chat.routes').then(m => m.CHAT_ROUTES)
  },
  {
    path: 'assistants',
    canActivate: [authGuard],
    loadChildren: () => import('./features/assistants/assistants.routes').then(m => m.ASSISTANTS_ROUTES)
  },
  {
    path: 'feedback',
    canActivate: [authGuard],
    loadChildren: () => import('./features/feedback/feedback.routes').then(m => m.FEEDBACK_ROUTES)
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadChildren: () => import('./features/notifications/notifications.routes').then(m => m.NOTIFICATIONS_ROUTES)
  },
  {
    path: 'knowledge-gaps',
    canActivate: [authGuard],
    loadChildren: () => import('./features/knowledge-gaps/knowledge-gaps.routes').then(m => m.KNOWLEDGE_GAPS_ROUTES)
  },
  {
    path: 'not-found',
    loadComponent: () => import('./shared/pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
  { path: '**', redirectTo: '/not-found' }
];
