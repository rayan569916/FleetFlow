export type IncomePeriod = 'today' | 'week' | 'month' | 'year';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  route?: string;
}

export interface ActivityLog {
  id: string;
  title: string;
  meta: string;
  icon: string;
  timestamp: string;
}

export interface Driver {
  id: string;
  name: string;
  initials: string;
  contact: string;
  status: 'active' | 'inactive';
  avatarUrl?: string;
}

export interface IncomeSnapshot {
  period: IncomePeriod;
  value: number;
  currency: string;
  budget: number;
}

export interface TrendPoint {
  month: string;
  value: number;
  label: string;
}

export interface Entry {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  price: number;
  amount: number;
}