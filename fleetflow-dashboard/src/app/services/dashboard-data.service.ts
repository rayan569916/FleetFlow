import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, switchMap, shareReplay, forkJoin } from 'rxjs';

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
  updatePurchase(id: number, data: any): Observable<any> {
    return this.http.put(`${this.rootUrl}/finance/purchases/${id}`, data);
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
  updateReceipt(id: number, data: any): Observable<any> {
    return this.http.put(`${this.rootUrl}/finance/receipts/${id}`, data);
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
  updatePayment(id: number, data: any): Observable<any> {
    return this.http.put(`${this.rootUrl}/finance/payments/${id}`, data);
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
    return forkJoin({
      stats: this.http.get<any>(`${this.apiUrl}/stats`, { params: { period } }),
      trends: this.http.get<any[]>(`${this.apiUrl}/trends`)
    }).pipe(
      map(({ stats, trends }) => ({
        revenue: stats?.revenue ?? 0,
        expenses: stats?.expenses ?? 0,
        profit: stats?.profit ?? 0,
        growth: stats?.growth ?? 0,
        history: (trends ?? []).map(t => Number((t?.value ?? 0) / 1000))
      }))
    );
  }

  getEfficiencyStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`, { params: { period: 'today' } }).pipe(
      map(stats => {
        const revenue = Number(stats?.revenue ?? 0);
        const profit = Number(stats?.profit ?? 0);
        const expenses = Number(stats?.expenses ?? 0);
        const overall = revenue > 0 ? Math.max(0, Math.min(100, Math.round((profit / revenue) * 100))) : 0;
        return {
          overall,
          maintenanceCost: expenses
        };
      })
    );
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
