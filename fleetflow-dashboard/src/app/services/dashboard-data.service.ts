import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of } from 'rxjs';

import { DRIVER_LIST, INCOME_DATA, RECENT_ACTIVITY, TREND_DATA_2024 } from '../core/constants/dashboard.constants';
import { ActivityLog, Driver, IncomePeriod, IncomeSnapshot, TrendPoint } from '../core/models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private readonly incomePeriodSubject = new BehaviorSubject<IncomePeriod>('today');

  readonly incomePeriod$ = this.incomePeriodSubject.asObservable();

  getRecentActivity(): Observable<ActivityLog[]> {
    return of(RECENT_ACTIVITY);
  }

  getDrivers(): Observable<Driver[]> {
    return of(DRIVER_LIST);
  }

  getSelectedIncome(): Observable<IncomeSnapshot> {
    return this.incomePeriod$.pipe(map((period) => INCOME_DATA[period]));
  }

  getYearlyTrends(): Observable<TrendPoint[]> {
    return this.incomePeriod$.pipe(
      map((period) => {
        const multiplier = period === 'today' ? 1 : period === 'week' ? 1.03 : period === 'month' ? 1.06 : 1.1;
        return TREND_DATA_2024.map((point) => {
          const scaledValue = Math.round(point.value * multiplier);
          return {
            ...point,
            value: scaledValue,
            label: this.formatCurrencyShort(scaledValue)
          };
        });
      })
    );
  }

  setIncomePeriod(period: IncomePeriod): void {
    this.incomePeriodSubject.next(period);
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
