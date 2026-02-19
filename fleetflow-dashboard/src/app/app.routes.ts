import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./layout/login-sign-up-layout.component/login-sign-up-layout.component').then((c) => c.LoginSignUpLayoutComponent)
  },


  {
    path: 'dashboard',
    loadComponent: () => import('./layout/dashboard-layout/dashboard-layout.component').then((c) => c.DashboardLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      },
      {
        path: 'payment',
        loadComponent: () => import('./dashboard/payment/payment.component').then(m => m.PaymentComponent)
      },
      {
        path: 'receipt',
        loadComponent: () => import('./dashboard/receipt/receipt.component').then(m => m.ReceiptComponent)
      },
      {
        path: 'purchase',
        loadComponent: () => import('./dashboard/purchase/purchase.component').then(m => m.PurchaseComponent)
      },
      {
        path: 'shipments',
        loadComponent: () => import('./dashboard/shipment/shipment.component').then(c => c.ShipmentComponent)
      },
      {
        path: 'overview',
        loadComponent: () => import('./dashboard/overview/dashboard-overview.component').then(c => c.DashboardOverviewComponent)
      },
      {
        path: 'tracking',
        loadComponent: () => import('./dashboard/tracking/tracking.component').then(c => c.TrackingComponent)
      },
      {
        path: 'live-tracking',
        loadComponent: () => import('./dashboard/live-tracking/live-tracking.component').then(c => c.LiveTrackingComponent)
      },
      {
        path: 'drivers',
        loadComponent: () => import('./dashboard/drivers/drivers.component').then(m => m.DriversComponent)
      },
      {
        path: 'drivers/add',
        loadComponent: () => import('./dashboard/drivers/add-driver/add-driver.component').then(m => m.AddDriverComponent)
      },
      {
        path: 'drivers/:id/profile',
        loadComponent: () => import('./dashboard/drivers/driver-profile/driver-profile.component').then(m => m.DriverProfileComponent)
      },
      {
        path: 'drivers/:id/route',
        loadComponent: () => import('./dashboard/drivers/driver-route/driver-route.component').then(m => m.DriverRouteComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./dashboard/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'income',
        loadComponent: () => import('./dashboard/income/income.component').then(m => m.IncomeComponent)
      },
      {
        path: 'invoice',
        loadComponent: () => import('./dashboard/invoice/invoice.component').then((c) => c.InvoiceComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/sign-up/sign-up').then((c) => c.SignUpComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./dashboard/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./dashboard/users/users.component').then(m => m.UsersComponent)
      },
      // Placeholders for expanded items
      { path: 'vehicles', redirectTo: 'overview' },
      { path: 'maintenance', redirectTo: 'overview' },
      { path: 'routes', redirectTo: 'overview' }
    ]
  }
];

