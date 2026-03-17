import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { UiStateService } from '../../services/ui-state.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    AsyncPipe,
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
    RouterLink
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLayoutComponent implements OnInit {
  private uiStateService = inject(UiStateService);
  private router = inject(Router);
  private dashboardDataService = inject(DashboardDataService);
  private authService = inject(AuthService);

  readonly isDriver = this.authService.isDriver;
  readonly sidebarExpanded$ = this.uiStateService.sidebarExpanded$;
  private activatedRoute = inject(ActivatedRoute);

  currentPageTitle = signal<string>('Overview');

  ngOnInit(): void {
    // If driver, redirect to driver-ui page immediately
    if (this.isDriver()) {
      this.router.navigate(['/dashboard/driver-ui']);
    }

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null), // Trigger initially
      map(() => {
        let child = this.activatedRoute.firstChild;
        while (child?.firstChild) {
          child = child.firstChild;
        }
        // Basic mapping for now, can be improved with route data
        const path = this.router.url.split('/')[2] || 'overview';
        return this.formatTitle(path);
      })
    ).subscribe(title => {
      this.currentPageTitle.set(title);
    });
  }

    private formatTitle(path: string): string {
    if (!path) return 'Overview';
    // Remove query params or IDs if simple split
    const cleanPath = path.split('?')[0].split('/')[0];

    // Custom mappings
    const mappings: Record<string, string> = {
      'overview': 'Overview',
      'drivers': 'Drivers',
      'vehicles': 'Vehicles',
      'maintenance': 'Maintenance',
      'routes': 'Routes',
      'reports': 'Reports',
      'income': 'Income',
      'invoice': 'Billing Invoice',
      'settings': 'Settings',
      'notifications': 'Notifications',
      'documents': 'Documents',
      'help': 'Help & Support',
      'tracking': 'Shipment Tracking',
      'payment': 'Payment',
      'receipt': 'Receipt',
      'purchase': 'Purchase',
      'register': 'Register User',
      'users': 'User Management',
      'offices': 'Office Management'
    };

    return mappings[cleanPath] || cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1);
  }


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

  logout(): void {
    this.authService.logout();
  }
}
