import {
  ActivityLog,
  Driver,
  IncomePeriod,
  IncomeSnapshot,
  NavItem,
  TrendPoint,
  Designation,
  Office,
  SelectOption,
  DeliveryOption,
  PaymentOption
} from '../models/dashboard.models';

export const SIDEBAR_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', active: true, route: '/dashboard' },
  { id: 'tracking', label: 'Tracking', icon: 'map', route: '/dashboard/tracking' },
  { id: 'shipments', label: 'Shipments', icon: 'box', route: '/dashboard/shipments' },
  { id: 'live-tracking', label: 'Live Tracking', icon: 'navigation', route: '/dashboard/live-tracking' },
  { id: 'payment', label: 'Payment', icon: 'credit-card', route: '/dashboard/payment' },
  { id: 'receipt', label: 'Receipt', icon: 'file-text', route: '/dashboard/receipt' },
  { id: 'purchase', label: 'Purchase', icon: 'shopping-cart', route: '/dashboard/purchase' },
  { id: 'drivers', label: 'Drivers', icon: 'users', route: '/dashboard/drivers' },
  { id: 'reports', label: 'Reports', icon: 'file', route: '/dashboard/reports' },
  { id: 'income', label: 'Income', icon: 'income', route: '/dashboard/income' },
  { id: 'invoice', label: 'Billing Invoice', icon: 'file', route: '/dashboard/invoice' },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '/dashboard/settings' },
  { id: 'register', label: 'Register User', icon: 'users', route: '/dashboard/register' }, // Visible only to Admin/CEO
  { id: 'logout', label: 'Logout', icon: 'logout', route: '' }
];









export const designations: ReadonlyArray<Designation> = [
  { id: 1, name: 'Cashier' },
  { id: 2, name: 'Manager' }
];

export const offices: ReadonlyArray<Office> = [
  { id: 101, name: 'Main Branch - Dubai' },
  { id: 102, name: 'Secondary Office - Abu Dhabi' },
  { id: 103, name: 'Logistics Hub - Riyadh' }
];

export const modeOfDeliveryOptions: ReadonlyArray<DeliveryOption> = [
  { label: 'Air', value: 'air' },
  { label: 'Water/Ship', value: 'water' }
];

export const modeOfPaymentOptions = [
  { label: 'Swipe', value: 'swipe' },
  { label: 'Direct Bank Transfer', value: 'bank_transfer' },
  { label: 'Direct Cash', value: 'cash' }
] as const satisfies ReadonlyArray<PaymentOption>;

// Income Period Options (used in IncomeCard and TotalCargoCard)
export const INCOME_PERIOD_OPTIONS: ReadonlyArray<SelectOption<IncomePeriod>> = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' }
];

// Transaction Categories (used in Transaction component)
export const TRANSACTION_CATEGORIES: ReadonlyArray<string> = [
  'Fuel',
  'Maintenance',
  'Salary',
  'Misc'
];