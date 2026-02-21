import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, switchMap, shareReplay } from 'rxjs';

import { ActivityLog, Driver, IncomePeriod, IncomeSnapshot, TrendPoint, LiveTrackingParams, Category } from '../core/models/dashboard.models';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiBaseUrl}/api/dashboard`;

  private readonly incomePeriodSubject = new BehaviorSubject<IncomePeriod>('today');
  readonly incomePeriod$ = this.incomePeriodSubject.asObservable();

  getRecentActivity(): Observable<ActivityLog[]> {
    return this.http.get<ActivityLog[]>(`${this.apiUrl}/recent-activity`);
  }



  getSelectedIncome(): Observable<IncomeSnapshot> {
    return this.incomePeriod$.pipe(
      switchMap(period => this.http.get<IncomeSnapshot>(`${this.apiUrl}/stats`, {
        params: { period }
      })),
      shareReplay(1)
    );
  }

  getYearlyTrends(): Observable<TrendPoint[]> {
    return this.http.get<TrendPoint[]>(`${this.apiUrl}/trends`).pipe(
      map(points => points.map(point => ({
        ...point,
        label: this.formatCurrencyShort(point.value) // Ensure label is formatted on frontend if backend doesn't provide it
      })))
    );
  }

  getLiveTrackingLocations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.rootUrl}/fleet/live-tracking`);
  }

  private get rootUrl() { return `${environment.apiBaseUrl}/api`; }

  // --- Purchases ---
  getPurchases(params: any = {}): Observable<any> {
    return this.http.get<any>(`${this.rootUrl}/finance/purchases`, { params });
  }
  createPurchase(data: any): Observable<any> {
    return this.http.post(`${this.rootUrl}/finance/purchases`, data);
  }
  deletePurchase(id: number): Observable<any> {
    return this.http.delete(`${this.rootUrl}/finance/purchases/${id}`);
  }

  // --- Receipts ---
  getReceipts(params: any = {}): Observable<any> {
    return this.http.get<any>(`${this.rootUrl}/finance/receipts`, { params });
  }
  createReceipt(data: any): Observable<any> {
    return this.http.post(`${this.rootUrl}/finance/receipts`, data);
  }
  deleteReceipt(id: number): Observable<any> {
    return this.http.delete(`${this.rootUrl}/finance/receipts/${id}`);
  }

  // --- Payments ---
  getPayments(params: any = {}): Observable<any> {
    return this.http.get<any>(`${this.rootUrl}/finance/payments`, { params });
  }
  createPayment(data: any): Observable<any> {
    return this.http.post(`${this.rootUrl}/finance/payments`, data);
  }
  deletePayment(id: number): Observable<any> {
    return this.http.delete(`${this.rootUrl}/finance/payments/${id}`);
  }

  // --- Categories ---
  getPurchaseCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.rootUrl}/finance/purchase-categories`);
  }
  getReceiptCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.rootUrl}/finance/receipt-categories`);
  }
  getPaymentCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.rootUrl}/finance/payment-categories`);
  }

  // --- Drivers ---
  // Replaces previous hardcoded method
  getDrivers(): Observable<Driver[]> {
    return this.http.get<any[]>(`${this.rootUrl}/fleet/drivers`).pipe(
      map(drivers => drivers.map(d => ({
        id: d.id.toString(),
        name: d.name,
        initials: d.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
        contact: d.contact_number,
        status: d.status.toLowerCase() === 'active' ? 'active' : 'inactive',
        avatarUrl: '' // Placeholder
      })))
    );
  }
  createDriver(data: any): Observable<any> {
    return this.http.post(`${this.rootUrl}/fleet/drivers`, data);
  }

  // --- Tracking ---
  getTrackingInfo(trackingNumber: string): Observable<any> {
    return this.http.get<any>(`${this.rootUrl}/shipments/tracking/${trackingNumber}`);
  }

  setIncomePeriod(period: IncomePeriod): void {
    this.incomePeriodSubject.next(period);
  }

  getFinancialStats(period: string): Observable<any> {
    // In a real app, this would fetch from an endpoint like /api/reports/financial
    // For now, we'll return a mock observable that simulates an API call
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          revenue: 125000,
          expenses: 85000,
          profit: 40000,
          growth: 12.5,
          history: [65, 59, 80, 81, 56, 55, 40, 70, 90, 100, 110, 120]
        });
        observer.complete();
      }, 500);
    });
  }

  getEfficiencyStats(): Observable<any> {
    // Mock for efficiency stats
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          overall: 89,
          fuelUsage: 12450,
          fuelTrend: 2.4, // +2.4%
          maintenanceCost: 3200,
          maintenanceTrend: -0.8 // -0.8%
        });
        observer.complete();
      }, 500);
    });
  }

  private formatCurrencyShort(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 1,
      notation: 'compact'
    }).format(value);
  }
}
