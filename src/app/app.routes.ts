/**
 * Rotas Phase 3d.
 *
 *   /login                   → LoginComponent (sem shell, sem guard)
 *   /                        → AppShell (authGuard)
 *      ├ ''                  → DashboardsPageComponent (fallback dashboard ativo)
 *      ├ d/:id               → DashboardsPageComponent (auto-redirect pra 1ª tab)
 *      └ d/:id/tab/:tabId    → DashboardsPageComponent
 */
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboards-page/dashboards-page.component').then((m) => m.DashboardsPageComponent),
      },
      {
        path: 'd/:id',
        loadComponent: () =>
          import('./pages/dashboards-page/dashboards-page.component').then((m) => m.DashboardsPageComponent),
      },
      {
        path: 'd/:id/tab/:tabId',
        loadComponent: () =>
          import('./pages/dashboards-page/dashboards-page.component').then((m) => m.DashboardsPageComponent),
      },
      {
        path: 'settings/branding',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/branding-settings/branding-settings.component').then(
            (m) => m.BrandingSettingsPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
