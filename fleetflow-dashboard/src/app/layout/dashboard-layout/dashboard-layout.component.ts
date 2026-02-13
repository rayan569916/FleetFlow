import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { RecentActivityComponent } from '../../dashboard/recent-activity/recent-activity.component';
import { IncomeCardComponent } from '../../dashboard/income-card/income-card.component';
import { TrendsChartComponent } from '../../dashboard/trends-chart/trends-chart.component';
import { DriversListComponent } from '../../dashboard/drivers-list/drivers-list.component';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { UiStateService } from '../../services/ui-state.service';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TotalCargoCardComponent } from "../../dashboard/total-cargo-card.component/total-cargo-card.component";

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    AsyncPipe,
    SidebarComponent,
    HeaderComponent,
    RecentActivityComponent,
    IncomeCardComponent,
    TrendsChartComponent,
    DriversListComponent,
    TotalCargoCardComponent
],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLayoutComponent {
  private uiStateService = inject(UiStateService);
  private dashboardDataService = inject(DashboardDataService);

  readonly sidebarExpanded$ = this.uiStateService.sidebarExpanded$;
  readonly activity$ = this.dashboardDataService.getRecentActivity();
  readonly drivers$ = this.dashboardDataService.getDrivers();
  readonly income$ = this.dashboardDataService.getSelectedIncome();
  readonly trends$ = this.dashboardDataService.getYearlyTrends();
  readonly period$ = this.dashboardDataService.incomePeriod$;



  toggleSidebar(): void {
    this.uiStateService.toggleSidebar();
  }

  closeSidebar(): void {
    this.uiStateService.setSidebarExpanded(false);
  }

  onPeriodChange(period: 'today' | 'week' | 'month' | 'year'): void {
    this.dashboardDataService.setIncomePeriod(period);
  }
}
