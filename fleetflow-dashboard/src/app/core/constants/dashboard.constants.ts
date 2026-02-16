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
  { id: 'drivers', label: 'Drivers', icon: 'users', route: '#' },
  { id: 'reports', label: 'Reports', icon: 'file', route: '#' },
  { id: 'income', label: 'Income', icon: 'income', route: '#' },
  { id: 'invoice', label: 'Billing Invoice', icon: 'file', route: '/dashboard/invoice' },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '#' },
  { id: 'logout', label: 'Logout', icon: 'logout', route: '#' }
];

export const RECENT_ACTIVITY: ActivityLog[] = [
  { id: '1', title: 'Package delivered to Zone A', meta: '2 minutes ago • TRK-4892', icon: 'package', timestamp: '2m' },
  { id: '2', title: 'Driver Michael started route', meta: '8 minutes ago • Route 14B', icon: 'clock', timestamp: '8m' },
  { id: '3', title: 'Transaction completed', meta: '15 minutes ago • €284.50', icon: 'check', timestamp: '15m' },
  { id: '4', title: 'New driver Sarah joined', meta: '32 minutes ago • ID: DRV-1047', icon: 'user', timestamp: '32m' },
  { id: '5', title: '5-star rating received', meta: '1 hour ago • Customer feedback', icon: 'star', timestamp: '1h' },
  { id: '6', title: 'Delivery cancelled', meta: '1 hour ago • TRK-4885', icon: 'x', timestamp: '1h' }
];

export const DRIVER_LIST: Driver[] = [
  { id: '1', name: 'Michael Johnson', initials: 'MJ', contact: '+1 (555) 234-5678', status: 'active' },
  { id: '2', name: 'Sarah Chen', initials: 'SC', contact: '+1 (555) 876-5432', status: 'active' },
  { id: '3', name: 'David Parker', initials: 'DP', contact: '+1 (555) 345-6789', status: 'inactive' },
  { id: '4', name: 'Emma Rodriguez', initials: 'ER', contact: '+1 (555) 987-6543', status: 'active' },
  { id: '5', name: 'James Wilson', initials: 'JW', contact: '+1 (555) 456-7890', status: 'active' },
  { id: '6', name: 'Lisa Thompson', initials: 'LT', contact: '+1 (555) 567-8901', status: 'active' },
  { id: '7', name: 'Robert Kim', initials: 'RK', contact: '+1 (555) 678-9012', status: 'active' },
  { id: '8', name: 'Anna Martinez', initials: 'AM', contact: '+1 (555) 789-0123', status: 'active' }
];

export const INCOME_DATA: Record<IncomePeriod, IncomeSnapshot> = {
  today: { period: 'today', value: 8429, currency: 'EUR', budget: 10000 },
  week: { period: 'week', value: 42156, currency: 'EUR', budget: 50000 },
  month: { period: 'month', value: 164892, currency: 'EUR', budget: 200000 },
  year: { period: 'year', value: 1847235, currency: 'EUR', budget: 2200000 }
};

export const TREND_DATA_2024: TrendPoint[] = [
  { month: 'JAN', value: 45200, label: '€45.2K' },
  { month: 'FEB', value: 38500, label: '€38.5K' },
  { month: 'MAR', value: 52800, label: '€52.8K' },
  { month: 'APR', value: 48300, label: '€48.3K' },
  { month: 'MAY', value: 56100, label: '€56.1K' },
  { month: 'JUN', value: 69600, label: '€69.6K' },
  { month: 'JUL', value: 48900, label: '€48.9K' },
  { month: 'AUG', value: 42700, label: '€42.7K' },
  { month: 'SEP', value: 51200, label: '€51.2K' },
  { month: 'OCT', value: 46800, label: '€46.8K' },
  { month: 'NOV', value: 58400, label: '€58.4K' },
  { month: 'DEC', value: 54300, label: '€54.3K' }
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