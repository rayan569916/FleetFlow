import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { UiStateService } from '../../services/ui-state.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    AsyncPipe,
    RouterOutlet,
    SidebarComponent,
    HeaderComponent
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLayoutComponent {
  private uiStateService = inject(UiStateService);
  private router = inject(Router);
  private dashboardDataService = inject(DashboardDataService);

  readonly sidebarExpanded$ = this.uiStateService.sidebarExpanded$;

  toggleSidebar(): void {
    this.uiStateService.toggleSidebar();
  }

  closeSidebar(): void {
    this.uiStateService.setSidebarExpanded(false);
  }

  onPeriodChange(period: 'today' | 'week' | 'month' | 'year'): void {
    this.dashboardDataService.setIncomePeriod(period);
  }

  navigateToTransaction(type: string): void {
    const categoryMap: { [key: string]: string[] } = {
      'Payment': ['Salary', 'Bonus', 'Refund', 'Other Income'],
      'Receipt': ['Fuel', 'Toll', 'Maintenance', 'Insurance', 'Registration'],
      'Purchase': ['Computer', 'Smartphone', 'Vehicle', 'Equipment', 'Supplies']
    };

    this.router.navigate(['/transaction-layout'], {
      queryParams: {
        type,
        categories: JSON.stringify(categoryMap[type] || [])
      }
    });
  }

  navigateToBillingInvoice(): void {
    this.router.navigate(['/dashboard/invoice']);
  }

  navigateToDailyReport(): void {
    this.router.navigate(['/dashboard/daily-report']);
  }
}
