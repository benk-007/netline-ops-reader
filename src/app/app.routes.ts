import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'gantt',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'status',
        loadComponent: () => import('./pages/flight-status/flight-status.component').then(m => m.FlightStatusComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: '',
        redirectTo: 'gantt',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'station',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/station-dashboard/station-dashboard.component').then(m => m.StationDashboardComponent)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
