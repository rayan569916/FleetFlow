import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';
import { pendingChangesGuard } from './guards/pending-changes.guard';

const ALL_ROLES = ['Super_admin', 'management', 'shop_manager', 'driver'];
const NON_DRIVER = ['Super_admin', 'management', 'shop_manager'];
const ADMIN_ONLY = ['Super_admin', 'super_admin', 'management'];

export const routes: Routes = [
  {
    path: '', redirectTo: 'login', pathMatch: 'full'
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
        loadComponent: () => import('./dashboard/payment/payment.component').then(m => m.PaymentComponent),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'receipt',
        loadComponent: () => import('./dashboard/receipt/receipt.component').then(m => m.ReceiptComponent),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'purchase',
        loadComponent: () => import('./dashboard/purchase/purchase.component').then(m => m.PurchaseComponent),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'shipments',
        loadComponent: () => import('./dashboard/shipment/shipment.component').then(c => c.ShipmentComponent),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'overview',
        loadComponent: () => import('./dashboard/overview/dashboard-overview.component').then(c => c.DashboardOverviewComponent),
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'tracking',
        loadComponent: () => import('./dashboard/tracking/tracking.component').then(c => c.TrackingComponent),
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'live-tracking',
        loadComponent: () => import('./dashboard/live-tracking/live-tracking.component').then(c => c.LiveTrackingComponent),
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'drivers',
        loadComponent: () => import('./dashboard/drivers/drivers.component').then(m => m.DriversComponent),
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'drivers/add',
        loadComponent: () => import('./dashboard/drivers/add-driver/add-driver.component').then(m => m.AddDriverComponent),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'drivers/:id/profile',
        loadComponent: () => import('./dashboard/drivers/driver-profile/driver-profile.component').then(m => m.DriverProfileComponent),
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'drivers/:id/route',
        loadComponent: () => import('./dashboard/drivers/driver-route/driver-route.component').then(m => m.DriverRouteComponent),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'reports',
        loadComponent: () => import('./dashboard/reports/reports.component').then(m => m.ReportsComponent),
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'income',
        loadComponent: () => import('./dashboard/income/income.component').then(m => m.IncomeComponent),
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'invoice',
        loadComponent: () => import('./dashboard/invoice/invoice.component').then((c) => c.InvoiceComponent),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: ALL_ROLES }
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/sign-up/sign-up').then((c) => c.SignUpComponent),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: ADMIN_ONLY }
      },
      {
        path: 'offices',
        loadComponent: () => import('./dashboard/offices/offices').then((c) => c.OfficesComponent),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: ADMIN_ONLY }
      },
      {
        path: 'settings',
        loadComponent: () => import('./dashboard/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'users',
        loadComponent: () => import('./dashboard/users/users.component').then(m => m.UsersComponent),
        canActivate: [roleGuard],
        data: { roles: ADMIN_ONLY }
      },
      {
        path: 'daily-report',
        loadComponent: () => import('./dashboard/daily-report/daily-report').then((c) => c.DailyReport),
        canActivate: [roleGuard],
        data: { roles: NON_DRIVER }
      },
      {
        path: 'unit-price',
        loadComponent: () => import('./dashboard/unit-price/unit-price').then((c) => c.UnitPrice),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: ADMIN_ONLY }
      },
      {
        path: 'cargo-items',
        loadComponent: () => import('./dashboard/cargo-items/cargo-items').then((c) => c.CargoItems),
        canDeactivate: [pendingChangesGuard],
        canActivate: [roleGuard],
        data: { roles: ADMIN_ONLY }
      },
      { path: 'vehicles', redirectTo: 'overview' },
      { path: 'maintenance', redirectTo: 'overview' },
      { path: 'routes', redirectTo: 'overview' }
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./layout/login-sign-up-layout.component/login-sign-up-layout.component').then((c) => c.LoginSignUpLayoutComponent)
  },
  {
    path: 'transaction-layout',
    loadComponent: () => import('./layout/transaction-layout/transaction-layout').then((c) => c.TransactionLayout)
  },
  {
    path: 'barcode',
    loadComponent: () => import('./barcode/barcode').then((c) => c.ScannerComponent)
  }
];
