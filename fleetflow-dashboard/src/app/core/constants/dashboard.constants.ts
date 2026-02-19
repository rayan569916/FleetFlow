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
  PaymentOption,
  InvoiceRecord,
  Entry
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


export const submittedInvoices: InvoiceRecord[] = [
  { grandTotal: 3500, modeOfPayment: 'swipe', totalWeight: 12.5, date: new Date().toLocaleDateString() },
  { grandTotal: 2200, modeOfPayment: 'bank_transfer', totalWeight: 8.0, date: new Date().toLocaleDateString() },
  { grandTotal: 1800, modeOfPayment: 'cash', totalWeight: 5.5, date: new Date().toLocaleDateString() },
  { grandTotal: 4100, modeOfPayment: 'swipe', totalWeight: 15.0, date: new Date().toLocaleDateString() },
  { grandTotal: 900, modeOfPayment: 'cash', totalWeight: 3.0, date: new Date().toLocaleDateString() },
];

// ─── DUMMY TRANSACTION DATA ──────────────────────────────────────────────────
export const payments: Entry[] = [
  { id: 1, amount: 500, category: 'Payment', description: 'Payment #1001', date: new Date().toLocaleDateString() },
  { id: 2, amount: 750, category: 'Payment', description: 'Payment #1002', date: new Date().toLocaleDateString() },
  { id: 3, amount: 300, category: 'Payment', description: 'Payment #1003', date: new Date().toLocaleDateString() },
];

export const purchases: Entry[] = [
  { id: 1, amount: 1200, category: 'Purchase', description: 'Purchase #2001', date: new Date().toLocaleDateString() },
  { id: 2, amount: 850, category: 'Purchase', description: 'Purchase #2002', date: new Date().toLocaleDateString() },
  { id: 3, amount: 450, category: 'Purchase', description: 'Purchase #2003', date: new Date().toLocaleDateString() },
];

export const receipts: Entry[] = [
  { id: 1, amount: 2000, category: 'Receipt', description: 'Receipt #3001', date: new Date().toLocaleDateString() },
  { id: 2, amount: 1500, category: 'Receipt', description: 'Receipt #3002', date: new Date().toLocaleDateString() },
  { id: 3, amount: 600, category: 'Receipt', description: 'Receipt #3003', date: new Date().toLocaleDateString() },
];
