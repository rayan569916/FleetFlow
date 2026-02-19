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
  amount?: number;
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

export interface ChartPoint {
  month: string;
  value: number;
  label: string;
}

export interface ChartPointMapped extends ChartPoint {
  x: number;
  y: number;
}

export interface Designation {
  id: number;
  name: string;
}

export interface Office {
  id: number;
  name: string;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

export interface DeliveryOption extends SelectOption<'air' | 'water'> { }

export interface LiveTrackingParams {
  driver_id: number;
  latitude: number;
  longitude: number;
  last_updated?: string;
  speed?: number;
  heading?: number;
  driver_name?: string;
}

export interface PaymentOption extends SelectOption<'swipe' | 'bank_transfer' | 'cash'> { }