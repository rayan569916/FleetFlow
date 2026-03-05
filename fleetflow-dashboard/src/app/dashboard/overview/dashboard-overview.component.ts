import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { RecentActivityComponent } from '../recent-activity/recent-activity.component';
import { TrendsChartComponent } from '../trends-chart/trends-chart.component';
import { DriversListComponent } from '../drivers-list/drivers-list.component';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    AsyncPipe,
    RecentActivityComponent,
    TrendsChartComponent,
    DriversListComponent,
    CardComponent
  ],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOverviewComponent {
  private dashboardDataService = inject(DashboardDataService);
  private router = inject(Router);

  readonly activity$ = this.dashboardDataService.getRecentActivity();
  readonly drivers$ = this.dashboardDataService.getDrivers();
  readonly period$ = this.dashboardDataService.incomePeriod$;

  onPeriodChange(period: 'today' | 'week' | 'month' | 'year'): void {
    this.dashboardDataService.setIncomePeriod(period);
  }

  navigateToTransaction(type: string): void {
    const routePath = `/dashboard/${type.toLowerCase()}`;
    this.router.navigate([routePath]);
  }

  navigateToBillingInvoice(): void {
    this.router.navigate(['/dashboard/invoice']);
  }

  navigateToReports(): void {
    this.router.navigate(['/dashboard/reports']);
  }
}
