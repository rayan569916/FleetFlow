import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/dashboard-layout/dashboard-layout.component').then((c) => c.DashboardLayoutComponent)
  }
];
