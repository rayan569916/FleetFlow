import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '', redirectTo:'login',pathMatch:'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./layout/dashboard-layout/dashboard-layout.component').then((c) => c.DashboardLayoutComponent)
  },
  {
    path: 'login',
    loadComponent:  ()=> import('./layout/login-sign-up-layout.component/login-sign-up-layout.component').then((c)=>c.LoginSignUpLayoutComponent)
  },
  {
    path: 'transaction-layout',
    loadComponent: () => import('./layout/transaction-layout/transaction-layout').then((c) => c.TransactionLayout)
  },
  {
    path: 'dashboard/invoice',
    loadComponent: () => import('./dashboard/invoice/invoice.component').then((c) => c.InvoiceComponent)
  }
];
