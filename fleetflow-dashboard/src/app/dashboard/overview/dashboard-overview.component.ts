import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { RecentActivityComponent } from '../recent-activity/recent-activity.component';
import { TrendsChartComponent } from '../trends-chart/trends-chart.component';
import { DriversListComponent } from '../drivers-list/drivers-list.component';
import { TotalCargoCardComponent } from "../total-cargo-card.component/total-cargo-card.component";
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    AsyncPipe,
    RecentActivityComponent,
    TrendsChartComponent,
    DriversListComponent,
    TotalCargoCardComponent,
    CardComponent
  ],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.css',
})
export class DashboardOverviewComponent {
  private dashboardDataService = inject(DashboardDataService);
  private router = inject(Router);

  readonly activity$ = this.dashboardDataService.getRecentActivity();
  readonly drivers$ = this.dashboardDataService.getDrivers();
  readonly income$ = this.dashboardDataService.getSelectedIncome();
  readonly trends$ = this.dashboardDataService.getYearlyTrends();
  readonly period$ = this.dashboardDataService.incomePeriod$;

  onPeriodChange(period: 'today' | 'week' | 'month' | 'year'): void {
    this.dashboardDataService.setIncomePeriod(period);
  }

  navigateToTransaction(type: string): void {
    // Navigate to the specific route based on type
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
